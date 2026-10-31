-- Fixes found by the test suite:
-- 1) a non-array cart could reach jsonb_array_length() and fail with a raw error (OR has no evaluation order)
-- 2) the guest order link must not expose client_ip / idempotency_key

create or replace function public.place_order(
  p_items jsonb,
  p_email text,
  p_phone text,
  p_address jsonb,
  p_method public.payment_method,
  p_token_hash text,
  p_idempotency_key text,
  p_ip inet,
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
  v_email text := lower(trim(p_email));
begin
  if not private.is_service() then
    raise exception 'Server only' using errcode = '42501';
  end if;
  if coalesce(length(p_idempotency_key), 0) not between 16 and 100 then
    raise exception 'Missing checkout key' using errcode = '22023';
  end if;

  -- Same checkout attempt (double click, retry, refresh): serialize on the key, return the first order.
  perform pg_advisory_xact_lock(hashtextextended('order:' || p_idempotency_key, 0));
  select * into o from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return o;
  end if;

  if private.is_blocked(p_ip, v_email, v_phone) then
    raise exception 'We could not place this order. Please contact support.' using errcode = '42501';
  end if;
  -- ponytail: fixed limits; move into settings if they need tuning per store.
  if p_ip is not null then
    perform private.hit('order:ip:' || host(p_ip), 5, 600);        -- 5 orders / 10 min / IP
  end if;
  perform private.hit('order:email:' || v_email, 5, 3600);          -- 5 orders / hour / email
  if p_method = 'cod' and v_phone is not null then
    perform private.hit('order:cod-phone:' || v_phone, 3, 86400);  -- 3 COD orders / day / phone
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
  if (case when jsonb_typeof(p_items) is distinct from 'array' then true else jsonb_array_length(p_items) not between 1 and 50 end) then
    raise exception 'Your cart must have between 1 and 50 lines' using errcode = '22023';
  end if;
  -- CASE forces the type checks to run before any cast (OR has no guaranteed evaluation order)
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where case
      when jsonb_typeof(e) is distinct from 'object' then true
      when coalesce(e ->> 'variant_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then true
      when jsonb_typeof(e -> 'quantity') is distinct from 'number' then true
      else (e ->> 'quantity')::numeric <> floor((e ->> 'quantity')::numeric) or (e ->> 'quantity')::numeric not between 1 and 99
    end
  ) then
    raise exception 'Each cart line needs a valid product and a whole quantity between 1 and 99' using errcode = '22023';
  end if;
  if jsonb_typeof(p_address) is distinct from 'object'
     or coalesce(trim(p_address ->> 'name'), '') = ''
     or coalesce(trim(p_address ->> 'line1'), '') = ''
     or coalesce(trim(p_address ->> 'city'), '') = ''
     or length(p_address::text) > 2000 then
    raise exception 'A shipping name, address and city are required' using errcode = '22023';
  end if;

  perform 1 from public.products p
  where p.id in (
    select v.product_id from public.variants v
    where v.id in (select (e ->> 'variant_id')::uuid from jsonb_array_elements(p_items) e)
  )
  order by p.id for update;

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
    user_id, public_token_hash, idempotency_key, client_ip, email, phone, whatsapp_opt_in, marketing_opt_in, shipping_address,
    payment_method, status, payment_status, currency,
    subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
    discount_code, gift_note, expires_at
  ) values (
    p_user_id, p_token_hash, p_idempotency_key, p_ip, v_email, v_phone, coalesce(p_whatsapp, false), coalesce(p_marketing, false), p_address,
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

create or replace function public.get_order_by_token(p_token_hash text) returns jsonb
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
    'order', to_jsonb(o) - 'public_token_hash' - 'user_id' - 'stock_released' - 'client_ip' - 'idempotency_key',
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
