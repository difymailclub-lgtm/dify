-- Guest vs. account flows.
-- 1) Customers may read the proofs/events of their own orders (order page for signed-in users).
-- 2) COD confirm/cancel straight from the order page (holder of the secret order link).
-- 3) When a customer later confirms an account with the same email, their guest orders attach to it
--    (only on a real email confirmation; auto-confirmed sign-ups never trigger this).
-- 4) Admin customer list reports whether the email has an account.

create index if not exists orders_email_idx on public.orders (email);

create policy "read own order events" on public.order_events
  for select to authenticated using (
    type in ('placed', 'status')
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );
create policy "read own payment proofs" on public.payment_proofs
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );
-- customers see status + reason only, never storage paths or reviewer ids
revoke select on public.payment_proofs from authenticated;
grant select (id, order_id, status, reject_reason, created_at) on public.payment_proofs to authenticated;

create function public.respond_by_order_token(p_token_hash text, p_confirm boolean) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if not private.is_service() then
    raise exception 'Server only' using errcode = '42501';
  end if;
  select * into o from public.orders where public_token_hash = p_token_hash;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if o.status <> 'awaiting_confirmation' then
    raise exception 'This order is no longer waiting for confirmation' using errcode = '22023';
  end if;
  return private.apply_transition(
    o.id,
    case when p_confirm then 'confirmed' else 'cancelled' end::public.order_status,
    'customer', o.user_id,
    case when p_confirm then 'Customer confirmed the order' else 'Customer cancelled the order' end
  );
end $$;
revoke execute on function public.respond_by_order_token(text, boolean) from public, anon, authenticated;
grant execute on function public.respond_by_order_token(text, boolean) to service_role;

create function private.link_guest_orders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.order_transition', 'on', true);
  update public.orders set user_id = new.id
  where user_id is null and email = lower(new.email);
  perform set_config('app.order_transition', 'off', true);
  return new;
end $$;
create trigger on_email_confirmed after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.link_guest_orders();

drop function public.admin_customers();
create function public.admin_customers() returns table (
  email text, name text, phone text, orders bigint, spent_cents bigint,
  cod_cancelled bigint, last_order_at timestamptz, marketing boolean, has_account boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
  select o.email,
         (array_agg(o.shipping_address ->> 'name' order by o.created_at desc))[1],
         (array_agg(o.phone order by o.created_at desc) filter (where o.phone is not null))[1],
         count(*),
         coalesce(sum(o.total_cents) filter (where o.payment_status in ('paid', 'cod_collected')), 0),
         count(*) filter (where o.payment_method = 'cod' and o.status = 'cancelled'),
         max(o.created_at),
         bool_or(o.marketing_opt_in),
         exists (select 1 from auth.users u where lower(u.email) = o.email)
  from public.orders o
  group by o.email
  order by max(o.created_at) desc
  limit 2000;
end $$;
revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;
