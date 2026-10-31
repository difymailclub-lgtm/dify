-- Admin panel support: internal notes, customer overview, realtime updates.

create function public.add_order_note(p_order uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Note is empty' using errcode = '22023';
  end if;
  insert into public.order_events (order_id, type, note, actor_id, actor_kind)
  values (p_order, 'note', left(trim(p_note), 1000), (select auth.uid()), 'admin');
end $$;

-- One row per customer email, with a COD-risk signal (unconfirmed / cancelled COD orders).
create function public.admin_customers() returns table (
  email text, name text, phone text, orders bigint, spent_cents bigint,
  cod_cancelled bigint, last_order_at timestamptz, marketing boolean
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
         bool_or(o.marketing_opt_in)
  from public.orders o
  group by o.email
  order by max(o.created_at) desc
  limit 2000;
end $$;

revoke execute on function public.add_order_note(uuid, text) from public, anon;
revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.add_order_note(uuid, text) to authenticated;
grant execute on function public.admin_customers() to authenticated;

-- Live admin updates (RLS still applies to realtime: customers only receive their own rows).
alter publication supabase_realtime add table public.orders, public.payment_proofs;
