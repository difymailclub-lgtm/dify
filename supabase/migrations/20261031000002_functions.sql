-- Business logic. Every order status change goes through private.apply_transition().
-- Callers: admins (JWT, checked with is_admin()) or the Vercel server (service_role key).

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

create function private.is_service() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.role()) = 'service_role', false)
$$;

/* ---------- Guard: status, money and identity fields only change via apply_transition ---------- */
create function private.guard_order_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.order_transition', true), 'off') <> 'on' and (
       new.status is distinct from old.status
    or new.payment_status is distinct from old.payment_status
    or new.payment_method is distinct from old.payment_method
    or new.subtotal_cents is distinct from old.subtotal_cents
    or new.discount_cents is distinct from old.discount_cents
    or new.shipping_cents is distinct from old.shipping_cents
    or new.tax_cents is distinct from old.tax_cents
    or new.total_cents is distinct from old.total_cents
    or new.public_token_hash is distinct from old.public_token_hash
    or new.user_id is distinct from old.user_id
    or new.number is distinct from old.number
  ) then
    raise exception 'Order status and totals can only change through transition_order()' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger orders_guard before update on public.orders for each row execute function private.guard_order_update();

/* ---------- Stock ---------- */
create function private.release_stock(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.products p set stock = p.stock + x.n
  from (
    select product_id, sum(quantity * units)::int as n
    from public.order_items where order_id = p_order and product_id is not null
    group by product_id
  ) x
  where p.id = x.product_id and p.stock is not null;
  update public.orders set stock_released = true where id = p_order;
end $$;

/* ---------- State machine ---------- */
create function private.apply_transition(
  p_order uuid, p_to public.order_status, p_actor_kind text, p_actor uuid,
  p_note text default null, p_fields jsonb default '{}'
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  v_from public.order_status;
  v_allowed public.order_status[];
  v_pay public.payment_status;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  v_from := o.status;

  v_allowed := case v_from
    when 'awaiting_payment'      then '{payment_review,cancelled}'
    when 'payment_review'        then '{confirmed,awaiting_payment,cancelled}'
    when 'awaiting_confirmation' then '{confirmed,cancelled}'
    when 'confirmed'             then '{packed,dispatched,cancelled}'
    when 'packed'                then '{dispatched,cancelled}'
    when 'dispatched'            then '{delivered,returned}'
    when 'delivered'             then '{returned}'
    else '{}'
  end::public.order_status[];

  if not (p_to = any (v_allowed)) then
    raise exception 'Order #% can''t move from % to %', o.number, v_from, p_to using errcode = '22023';
  end if;

  v_pay := o.payment_status;
  if p_to = 'payment_review' then v_pay := 'under_review';
  elsif v_from = 'payment_review' and p_to = 'confirmed' then v_pay := 'paid';
  elsif v_from = 'payment_review' and p_to = 'awaiting_payment' then v_pay := 'rejected';
  elsif p_to = 'delivered' and o.payment_method = 'cod' then v_pay := 'cod_collected';
  end if;

  perform set_config('app.order_transition', 'on', true);
  update public.orders set
    status = p_to,
    payment_status = v_pay,
    courier = coalesce(nullif(p_fields ->> 'courier', ''), courier),
    tracking_number = coalesce(nullif(p_fields ->> 'tracking_number', ''), tracking_number),
    transaction_ref = coalesce(nullif(p_fields ->> 'transaction_ref', ''), transaction_ref),
    -- a rejected transfer gets a fresh payment window; any other move clears the expiry
    expires_at = case when p_to = 'awaiting_payment'
      then now() + make_interval(hours => (select unpaid_expiry_hours from public.settings where id))
      else null end
  where id = p_order
  returning * into o;
  perform set_config('app.order_transition', 'off', true);

  if p_to in ('cancelled', 'returned') and not o.stock_released then
    perform private.release_stock(p_order);
    select * into o from public.orders where id = p_order;
  end if;

  insert into public.order_events (order_id, type, from_status, to_status, note, actor_id, actor_kind)
  values (p_order, 'status', v_from, p_to, left(p_note, 500), p_actor, p_actor_kind);

  return o;
end $$;

/* ---------- Admin entry points (JWT) ---------- */
create function public.transition_order(
  p_order uuid, p_to public.order_status, p_note text default null, p_fields jsonb default '{}'
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare v_status public.order_status;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select status into v_status from public.orders where id = p_order;
  if p_to = 'payment_review' then
    raise exception 'Payment review starts when the customer uploads a screenshot' using errcode = '22023';
  end if;
  if v_status = 'payment_review' and p_to in ('confirmed', 'awaiting_payment') then
    raise exception 'Approve or reject the payment screenshot instead' using errcode = '22023';
  end if;
  return private.apply_transition(p_order, p_to, 'admin', (select auth.uid()), p_note, coalesce(p_fields, '{}'));
end $$;

create function public.review_payment_proof(
  p_proof uuid, p_approve boolean, p_reason text default null, p_transaction_ref text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  pr public.payment_proofs;
  v_ref text := nullif(trim(p_transaction_ref), '');
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select * into pr from public.payment_proofs where id = p_proof for update;
  if not found then
    raise exception 'Payment proof not found' using errcode = 'P0002';
  end if;
  if pr.status <> 'pending' then
    raise exception 'This screenshot was already reviewed' using errcode = '22023';
  end if;
  if not p_approve and coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to reject a payment' using errcode = '22023';
  end if;

  update public.payment_proofs set
    status = case when p_approve then 'approved' else 'rejected' end::public.proof_status,
    reject_reason = case when p_approve then null else left(trim(p_reason), 500) end,
    transaction_ref = v_ref,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = p_proof;

  return private.apply_transition(
    pr.order_id,
    case when p_approve then 'confirmed' else 'awaiting_payment' end::public.order_status,
    'admin', (select auth.uid()),
    case when p_approve then 'Payment approved' else 'Payment rejected: ' || trim(p_reason) end,
    jsonb_build_object('transaction_ref', v_ref)
  );
end $$;

create function public.admin_settings() returns public.settings
language plpgsql stable security definer set search_path = '' as $$
declare s public.settings;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select * into s from public.settings where id;
  return s;
end $$;

create function public.admin_stats(p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'revenue_cents', (select coalesce(sum(total_cents), 0) from public.orders where payment_status in ('paid', 'cod_collected')),
    'orders', (select count(*) from public.orders where status <> 'cancelled'),
    'awaiting_review', (select count(*) from public.payment_proofs where status = 'pending'),
    'awaiting_confirmation', (select count(*) from public.orders where status = 'awaiting_confirmation'),
    'to_ship', (select count(*) from public.orders where status in ('confirmed', 'packed')),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'total_cents', coalesce(x.total, 0)) order by d.day), '[]')
      from (select generate_series(current_date - (least(greatest(p_days, 1), 90) - 1), current_date, interval '1 day')::date as day) d
      left join (
        select created_at::date as day, sum(total_cents) as total
        from public.orders where status not in ('cancelled', 'returned') group by 1
      ) x on x.day = d.day
    ),
    'low_stock', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'stock', stock) order by stock), '[]')
      from public.products
      where stock is not null and stock < (select low_stock_threshold from public.settings where id)
    )
  );
end $$;

/* ---------- Server entry points (service_role only) ---------- */
-- Prices, discounts, shipping, tax and stock are all decided here, never by the browser.
create function public.place_order(
  p_items jsonb,               -- [{"variant_id": uuid, "quantity": int}]
  p_email text,
  p_phone text,
  p_address jsonb,             -- {"name","line1","line2","city","region","postal_code","country"}
  p_method public.payment_method,
  p_token_hash text,           -- sha256 hex of the secret order-link token
  p_discount_code text default null,
  p_gift_note text default null,
  p_user_id uuid default null,
  p_marketing boolean default false,
  p_whatsapp boolean default false
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  s public.settings;
  d public.discount_codes;
  o public.orders;
  r record;
  v_sub int := 0;
  v_disc int := 0;
  v_ship int;
  v_tax int;
  v_total int;
  v_phone text := nullif(trim(p_phone), '');
begin
  if not private.is_service() then
    raise exception 'Server only' using errcode = '42501';
  end if;
  select * into s from public.settings where id;

  if p_method = 'bank_transfer' and not s.bank_transfer_enabled then
    raise exception 'Bank transfer is not available right now' using errcode = '22023';
  end if;
  if p_method = 'cod' and not s.cod_enabled then
    raise exception 'Cash on delivery is not available right now' using errcode = '22023';
  end if;
  if p_method = 'cod' and v_phone is null then
    raise exception 'A phone number is required for cash on delivery' using errcode = '22023';
  end if;
  if coalesce(length(p_token_hash), 0) <> 64 then
    raise exception 'Invalid order token' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Your cart must have between 1 and 50 lines' using errcode = '22023';
  end if;
  if jsonb_typeof(p_address) is distinct from 'object'
     or coalesce(trim(p_address ->> 'name'), '') = ''
     or coalesce(trim(p_address ->> 'line1'), '') = ''
     or coalesce(trim(p_address ->> 'city'), '') = '' then
    raise exception 'A shipping name, address and city are required' using errcode = '22023';
  end if;

  -- lock every product in the cart in a fixed order (prevents deadlocks and overselling)
  perform 1 from public.products p
  where p.id in (
    select v.product_id from public.variants v
    where v.id in (select (e ->> 'variant_id')::uuid from jsonb_array_elements(p_items) e)
  )
  order by p.id for update;

  -- price every line from the database
  for r in
    with lines as (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) e group by 1
    )
    select l.variant_id, l.quantity, v.id as vid, v.price_cents, p.name, p.status
    from lines l
    left join public.variants v on v.id = l.variant_id
    left join public.products p on p.id = v.product_id
  loop
    if r.vid is null then
      raise exception 'One of the items in your cart no longer exists' using errcode = '22023';
    end if;
    if r.status <> 'active' then
      raise exception '% is no longer available', r.name using errcode = '22023';
    end if;
    if r.quantity not between 1 and 99 then
      raise exception 'Quantities must be between 1 and 99' using errcode = '22023';
    end if;
    v_sub := v_sub + r.price_cents * r.quantity;
  end loop;

  -- hold stock (counted in single tins)
  for r in
    with lines as (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::int) as quantity
      from jsonb_array_elements(p_items) e group by 1
    )
    select p.id, p.name, p.stock, sum(v.units * l.quantity)::int as need
    from lines l
    join public.variants v on v.id = l.variant_id
    join public.products p on p.id = v.product_id
    group by p.id, p.name, p.stock
  loop
    if r.stock is not null and r.stock < r.need then
      raise exception 'Only % left of %', r.stock, r.name using errcode = '22023';
    end if;
    update public.products set stock = stock - r.need where id = r.id and stock is not null;
  end loop;

  -- discount
  if coalesce(trim(p_discount_code), '') <> '' then
    select * into d from public.discount_codes where code = upper(trim(p_discount_code)) for update;
    if not found
       or not d.active
       or (d.starts_at is not null and d.starts_at > now())
       or (d.ends_at is not null and d.ends_at < now())
       or (d.max_uses is not null and d.uses >= d.max_uses)
       or v_sub < d.min_subtotal_cents then
      raise exception 'That discount code is not valid' using errcode = '22023';
    end if;
    v_disc := case d.type
      when 'percent' then round(v_sub * d.value / 100.0)::int
      when 'fixed' then least(d.value, v_sub)
      else 0 end;
    update public.discount_codes set uses = uses + 1 where code = d.code;
  end if;

  v_ship := case when v_sub >= s.free_ship_threshold_cents or d.type = 'free_shipping' then 0 else s.shipping_flat_cents end;
  v_tax := round((v_sub - v_disc) * s.tax_rate)::int;
  v_total := v_sub - v_disc + v_ship + v_tax;

  if p_method = 'cod' and s.cod_max_total_cents is not null and v_total > s.cod_max_total_cents then
    raise exception 'Cash on delivery is only available for smaller orders. Please use bank transfer.' using errcode = '22023';
  end if;

  insert into public.orders (
    user_id, public_token_hash, email, phone, whatsapp_opt_in, marketing_opt_in, shipping_address,
    payment_method, status, payment_status, currency,
    subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
    discount_code, gift_note, expires_at
  ) values (
    p_user_id, p_token_hash, lower(trim(p_email)), v_phone, coalesce(p_whatsapp, false), coalesce(p_marketing, false), p_address,
    p_method,
    case p_method when 'cod' then 'awaiting_confirmation' else 'awaiting_payment' end::public.order_status,
    case p_method when 'cod' then 'cod_pending' else 'unpaid' end::public.payment_status,
    s.currency,
    v_sub, v_disc, v_ship, v_tax, v_total,
    d.code, nullif(left(trim(p_gift_note), 250), ''),
    now() + make_interval(hours => case p_method when 'cod' then s.cod_confirm_expiry_hours else s.unpaid_expiry_hours end)
  ) returning * into o;

  insert into public.order_items (order_id, product_id, variant_id, name, variant_title, unit_price_cents, quantity, units)
  with lines as (
    select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) e group by 1
  )
  select o.id, p.id, v.id, p.name, v.title, v.price_cents, l.quantity, v.units
  from lines l
  join public.variants v on v.id = l.variant_id
  join public.products p on p.id = v.product_id;

  insert into public.order_events (order_id, type, to_status, note, actor_id, actor_kind)
  values (o.id, 'placed', o.status, 'Order placed (' || p_method || ')', p_user_id, 'customer');

  return o;
end $$;

-- Customer uploaded a bank-transfer screenshot (file already in the private bucket under <order_id>/).
create function public.submit_payment_proof(p_token_hash text, p_file_path text) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if not private.is_service() then
    raise exception 'Server only' using errcode = '42501';
  end if;
  select * into o from public.orders where public_token_hash = p_token_hash for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if o.status <> 'awaiting_payment' then
    raise exception 'This order is not waiting for payment' using errcode = '22023';
  end if;
  if p_file_path not like o.id::text || '/%' then
    raise exception 'Invalid file' using errcode = '22023';
  end if;
  insert into public.payment_proofs (order_id, file_path) values (o.id, p_file_path);
  return private.apply_transition(o.id, 'payment_review', 'customer', null, 'Payment screenshot uploaded');
end $$;

-- Customer answered the cash-on-delivery confirmation (email now, WhatsApp later).
create function public.respond_to_order(p_token_hash text, p_confirm boolean) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare t public.action_tokens;
begin
  if not private.is_service() then
    raise exception 'Server only' using errcode = '42501';
  end if;
  select * into t from public.action_tokens
  where token_hash = p_token_hash and purpose = 'cod_confirm' for update;
  if not found or t.used_at is not null or t.expires_at < now() then
    raise exception 'This link has expired or was already used' using errcode = '22023';
  end if;
  update public.action_tokens set used_at = now() where token_hash = p_token_hash;
  return private.apply_transition(
    t.order_id,
    case when p_confirm then 'confirmed' else 'cancelled' end::public.order_status,
    'customer', null,
    case when p_confirm then 'Customer confirmed the order' else 'Customer cancelled the order' end
  );
end $$;

-- Guest order page (secret link). Never returns the token hash.
create function public.get_order_by_token(p_token_hash text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o public.orders;
begin
  if not private.is_service() then
    raise exception 'Server only' using errcode = '42501';
  end if;
  select * into o from public.orders where public_token_hash = p_token_hash;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'order', to_jsonb(o) - 'public_token_hash' - 'user_id' - 'stock_released',
    'items', (select coalesce(jsonb_agg(to_jsonb(i) - 'order_id' order by i.id), '[]') from public.order_items i where i.order_id = o.id),
    'proofs', (
      select coalesce(jsonb_agg(jsonb_build_object('status', p.status, 'reject_reason', p.reject_reason, 'created_at', p.created_at) order by p.created_at), '[]')
      from public.payment_proofs p where p.order_id = o.id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object('to_status', e.to_status, 'created_at', e.created_at) order by e.created_at), '[]')
      from public.order_events e where e.order_id = o.id and e.type in ('placed', 'status')
    ),
    'bank_details', case when o.payment_method = 'bank_transfer' then (select bank_details from public.settings where id) end
  );
end $$;

/* ---------- Scheduled cleanup ---------- */
create function private.expire_stale_orders() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id, status from public.orders
    where status in ('awaiting_payment', 'awaiting_confirmation') and expires_at < now()
    for update skip locked
  loop
    perform private.apply_transition(r.id, 'cancelled', 'system', null,
      case r.status when 'awaiting_payment' then 'Expired: no payment received' else 'Expired: not confirmed' end);
    n := n + 1;
  end loop;
  return n;
end $$;

/* ---------- Execute privileges ---------- */
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.transition_order(uuid, public.order_status, text, jsonb) to authenticated;
grant execute on function public.review_payment_proof(uuid, boolean, text, text) to authenticated;
grant execute on function public.admin_settings() to authenticated;
grant execute on function public.admin_stats(int) to authenticated;

grant execute on function public.place_order(jsonb, text, text, jsonb, public.payment_method, text, text, text, uuid, boolean, boolean) to service_role;
grant execute on function public.submit_payment_proof(text, text) to service_role;
grant execute on function public.respond_to_order(text, boolean) to service_role;
grant execute on function public.get_order_by_token(text) to service_role;
