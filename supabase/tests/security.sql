-- Security, abuse and business-rule tests for the shop database.
-- Run: scripts/db-test.sh supabase/tests/security.sql
-- Everything runs in ONE transaction that is always rolled back: success ends with the error
-- "ALL PASS (n): ..." (raised on purpose to undo the test data); a failure raises "FAIL <id>: ...".
--
-- "server" steps run as the owner with service_role JWT claims (what the Vercel functions send);
-- "anon"/customer/admin steps switch to the real API roles so RLS and grants are exercised.

create function pg_temp.li(v uuid, q jsonb) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', q))
$$;

create function pg_temp.po(
  items jsonb, email text default null, method public.payment_method default 'bank_transfer',
  phone text default null, code text default null, uid uuid default null, ikey text default null,
  ip inet default null, tok text default null,
  addr jsonb default '{"name":"T","line1":"1 Test St","city":"Testville"}', note text default null
) returns public.orders language sql volatile as $$
  select public.place_order(
    p_items => items,
    p_email => coalesce(email, gen_random_uuid()::text || '@test.dev'),
    p_phone => phone, p_address => addr, p_method => method,
    p_token_hash => encode(sha256(convert_to(coalesce(tok, gen_random_uuid()::text), 'UTF8')), 'hex'),
    p_idempotency_key => coalesce(ikey, gen_random_uuid()::text),
    p_ip => coalesce(ip, ('10.' || floor(random() * 250)::int || '.' || floor(random() * 250)::int || '.' || floor(random() * 250)::int)::inet),
    p_discount_code => code, p_gift_note => note, p_user_id => uid)
$$;

create function pg_temp.h(t text) returns text language sql as $$
  select encode(sha256(convert_to(t, 'UTF8')), 'hex')
$$;

do $$
declare
  a uuid := gen_random_uuid();      -- customer A
  b uuid := gen_random_uuid();      -- customer B
  adm uuid := gen_random_uuid();    -- admin
  v_coho uuid; v_coho3 uuid; v_tuna uuid; v_draft uuid; v_tiny uuid; p_tiny uuid;
  stock0 int; n int; x int; j jsonb;
  o public.orders; o2 public.orders; o3 public.orders; oc public.orders; tmp public.orders;
  pr uuid; ik text;
  ok text := ''; cnt int := 0;
  ab constant text := '{"role":"anon"}';
  sv constant text := '{"role":"service_role"}';
begin
  /* ================= setup (owner) ================= */
  insert into auth.users (id, email, aud, role) values
    (a, 'a@test.dev', 'authenticated', 'authenticated'),
    (b, 'b@test.dev', 'authenticated', 'authenticated'),
    (adm, 'admin@test.dev', 'authenticated', 'authenticated');
  insert into public.admins (user_id) values (adm);
  select v.id into v_coho from public.variants v join public.products p on p.id = v.product_id where p.slug = 'hot-smoked-coho' and v.units = 1;
  select v.id into v_coho3 from public.variants v join public.products p on p.id = v.product_id where p.slug = 'hot-smoked-coho' and v.units = 3;
  select v.id into v_tuna from public.variants v join public.products p on p.id = v.product_id where p.slug = 'albacore-chili-oil' and v.units = 1;
  update public.products set stock = 500 where slug in ('hot-smoked-coho', 'albacore-chili-oil');
  select stock into stock0 from public.products where slug = 'hot-smoked-coho';
  insert into public.products (slug, name, status, stock) values ('test-draft', 'Secret Draft', 'draft', 10);
  insert into public.variants (product_id, title, price_cents) select id, 'Single', 500 from public.products where slug = 'test-draft' returning id into v_draft;
  insert into public.products (slug, name, status, stock) values ('test-tiny', 'Tiny Stock', 'active', 3) returning id into p_tiny;
  insert into public.variants (product_id, title, price_cents) values (p_tiny, 'Single', 100) returning id into v_tiny;
  insert into public.discount_codes (code, type, value, active, ends_at) values ('TESTEXP', 'percent', 50, true, now() - interval '1 day');
  insert into public.discount_codes (code, type, value, active, max_uses) values ('TESTMAX', 'percent', 50, true, 1);
  insert into public.discount_codes (code, type, value, active, min_subtotal_cents) values ('TESTMIN', 'percent', 50, true, 100000);
  insert into public.discount_codes (code, type, value, active) values ('TESTFIX', 'fixed', 999999, true);
  insert into public.discount_codes (code, type, value, active) values ('TESTOFF', 'percent', 50, false);
  if (select count(*) from public.profiles where id in (a, b, adm)) <> 3 then raise exception 'FAIL setup: signup trigger did not create profiles'; end if;

  /* ================= A. anonymous visitor ================= */
  perform set_config('request.jwt.claims', ab, true);
  set local role anon;
  if (select count(*) from public.products) <> 14 then raise exception 'FAIL A1: anon should see the 13 seeded + 1 active test product'; end if;
  ok := ok || 'A1 ';
  if (select count(*) from public.products where slug = 'test-draft') + (select count(*) from public.variants where id = v_draft) <> 0 then raise exception 'FAIL A2: draft product visible'; end if;
  ok := ok || 'A2 ';
  if (select count(*) from public.discount_codes) <> 0 then raise exception 'FAIL A3: discount codes visible'; end if;
  ok := ok || 'A3 ';
  begin perform bank_details from public.settings; raise exception 'FAIL A4: bank details readable';
  exception when insufficient_privilege then ok := ok || 'A4 '; end;
  if (select free_ship_threshold_cents from public.settings) is null then raise exception 'FAIL A5: public settings unreadable'; end if;
  ok := ok || 'A5 ';
  begin perform public.place_order(p_items => '[]', p_email => 'x@y.dev', p_phone => null, p_address => '{}', p_method => 'bank_transfer', p_token_hash => repeat('a', 64), p_idempotency_key => repeat('k', 20), p_ip => null);
    raise exception 'FAIL A6: anon called place_order';
  exception when insufficient_privilege then ok := ok || 'A6 '; end;
  begin perform public.admin_stats(); raise exception 'FAIL A7: anon called admin_stats';
  exception when insufficient_privilege then ok := ok || 'A7 '; end;
  begin perform public.get_order_by_token(repeat('a', 64)); raise exception 'FAIL A7b: anon called get_order_by_token';
  exception when insufficient_privilege then ok := ok || 'A7b '; end;
  if (select count(*) from public.orders) + (select count(*) from public.order_items) + (select count(*) from public.payment_proofs)
     + (select count(*) from public.order_events) + (select count(*) from public.notifications) + (select count(*) from public.action_tokens)
     + (select count(*) from public.rate_limits) + (select count(*) from public.blocked_contacts) + (select count(*) from public.subscribers)
     + (select count(*) from public.admins) + (select count(*) from public.profiles) <> 0 then
    raise exception 'FAIL A8: anon can read private tables';
  end if;
  ok := ok || 'A8 ';
  begin insert into public.subscribers (email) values ('spam@test.dev'); raise exception 'FAIL A9: anon wrote subscribers directly';
  exception when insufficient_privilege then ok := ok || 'A9 '; end;
  begin insert into public.products (slug, name) values ('hack', 'Hack'); raise exception 'FAIL A10: anon created a product';
  exception when insufficient_privilege then ok := ok || 'A10 '; end;
  begin insert into storage.objects (bucket_id, name) values ('product-images', 'hack.png'); raise exception 'FAIL A11: anon uploaded an image';
  exception when insufficient_privilege then ok := ok || 'A11 '; end;
  if (select count(*) from storage.objects where bucket_id = 'payment-proofs') <> 0 then raise exception 'FAIL A12: anon lists payment proofs'; end if;
  ok := ok || 'A12 ';
  reset role;

  /* ================= B. placing orders (server) ================= */
  perform set_config('request.jwt.claims', sv, true);
  ik := 'dbl-click-' || gen_random_uuid();
  o := pg_temp.po(pg_temp.li(v_coho, '2'), email => '  A@Test.DEV ', code => 'welcome10', uid => a, ikey => ik, tok => 'tok-a');
  -- 2 x 1200 = 2400; 10% = 240; shipping 895 (< 7500); tax round(2160 * .08) = 173; total 3228
  if (o.subtotal_cents, o.discount_cents, o.shipping_cents, o.tax_cents, o.total_cents) <> (2400, 240, 895, 173, 3228)
     or o.status <> 'awaiting_payment' or o.payment_status <> 'unpaid' or o.email <> 'a@test.dev'
     or o.expires_at not between now() + interval '47 hours' and now() + interval '49 hours' then
    raise exception 'FAIL B1: wrong totals/state %', row_to_json(o);
  end if;
  ok := ok || 'B1 ';
  if (select stock from public.products where slug = 'hot-smoked-coho') <> stock0 - 2 then raise exception 'FAIL B2: stock not held'; end if;
  ok := ok || 'B2 ';
  for x in 1..5 loop  -- five more clicks with the same checkout key
    tmp := pg_temp.po(pg_temp.li(v_coho, '2'), email => 'a@test.dev', code => 'welcome10', uid => a, ikey => ik);
    if tmp.id <> o.id then raise exception 'FAIL B3: double click created a second order'; end if;
  end loop;
  if (select stock from public.products where slug = 'hot-smoked-coho') <> stock0 - 2
     or (select uses from public.discount_codes where code = 'WELCOME10') <> 1
     or (select count(*) from public.orders where idempotency_key = ik) <> 1 then
    raise exception 'FAIL B3b: retry consumed stock/discount again';
  end if;
  ok := ok || 'B3 ';
  tmp := pg_temp.po(pg_temp.li(v_coho, '7'));
  if tmp.shipping_cents <> 0 then raise exception 'FAIL B4: free shipping threshold'; end if;
  tmp := pg_temp.po(pg_temp.li(v_tuna, '1'), code => 'FREESHIP');
  if tmp.shipping_cents <> 0 or tmp.discount_cents <> 0 then raise exception 'FAIL B4b: FREESHIP code'; end if;
  ok := ok || 'B4 ';
  tmp := pg_temp.po(pg_temp.li(v_coho, '1') || pg_temp.li(v_coho, '2'));
  if (select count(*) from public.order_items where order_id = tmp.id) <> 1 or (select quantity from public.order_items where order_id = tmp.id) <> 3 then
    raise exception 'FAIL B5: duplicate lines not merged';
  end if;
  ok := ok || 'B5 ';
  foreach j in array array['0', '-1', '1.5', '"2"', '100', '1e30', 'null', '{"a":1}']::jsonb[] loop
    begin perform pg_temp.po(pg_temp.li(v_coho, j)); raise exception 'FAIL B6: quantity % accepted', j;
    exception when invalid_parameter_value then null; end;
  end loop;
  ok := ok || 'B6 ';
  begin perform pg_temp.po('[{"variant_id":"not-a-uuid","quantity":1}]'); raise exception 'FAIL B7: bad uuid accepted';
  exception when invalid_parameter_value then null; end;
  begin perform pg_temp.po(pg_temp.li(gen_random_uuid(), '1')); raise exception 'FAIL B7b: unknown variant accepted';
  exception when invalid_parameter_value then ok := ok || 'B7 '; end;
  begin perform pg_temp.po((select jsonb_agg(jsonb_build_object('variant_id', v_coho, 'quantity', 1)) from generate_series(1, 51))); raise exception 'FAIL B8: 51 lines';
  exception when invalid_parameter_value then null; end;
  begin perform pg_temp.po('[]'); raise exception 'FAIL B8b: empty cart';
  exception when invalid_parameter_value then null; end;
  begin perform pg_temp.po('{"variant_id":"x"}'); raise exception 'FAIL B8c: cart not an array';
  exception when invalid_parameter_value then ok := ok || 'B8 '; end;
  begin perform pg_temp.po(pg_temp.li(v_draft, '1')); raise exception 'FAIL B9: draft product sold';
  exception when invalid_parameter_value then ok := ok || 'B9 '; end;
  begin perform pg_temp.po(pg_temp.li(v_coho, '1'), addr => '{"line1":"x","city":"y"}'); raise exception 'FAIL B10: no name';
  exception when invalid_parameter_value then null; end;
  begin perform pg_temp.po(pg_temp.li(v_coho, '1'), addr => jsonb_build_object('name', 'n', 'line1', repeat('x', 3000), 'city', 'c')); raise exception 'FAIL B10b: huge address';
  exception when invalid_parameter_value then ok := ok || 'B10 '; end;
  begin perform pg_temp.po(pg_temp.li(v_coho, '1'), email => 'not-an-email'); raise exception 'FAIL B11: bad email';
  exception when check_violation then null; end;
  begin perform pg_temp.po(pg_temp.li(v_coho, '1'), method => 'cod', phone => '12345'); raise exception 'FAIL B11b: bad phone';
  exception when check_violation then ok := ok || 'B11 '; end;
  begin perform pg_temp.po(pg_temp.li(v_coho, '1'), method => 'cod'); raise exception 'FAIL B12: COD without phone';
  exception when invalid_parameter_value then null; end;
  oc := pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923001234567', tok => 'tok-cod');
  if oc.status <> 'awaiting_confirmation' or oc.payment_status <> 'cod_pending' or oc.expires_at > now() + interval '25 hours' then raise exception 'FAIL B12b: COD start state'; end if;
  ok := ok || 'B12 ';
  update public.settings set cod_max_total_cents = 1000;
  begin perform pg_temp.po(pg_temp.li(v_coho, '2'), method => 'cod', phone => '+923001111111'); raise exception 'FAIL B13: COD over limit';
  exception when invalid_parameter_value then ok := ok || 'B13 '; end;
  update public.settings set cod_max_total_cents = null, bank_transfer_enabled = false;
  begin perform pg_temp.po(pg_temp.li(v_coho, '1')); raise exception 'FAIL B14: disabled method accepted';
  exception when invalid_parameter_value then ok := ok || 'B14 '; end;
  update public.settings set bank_transfer_enabled = true;
  foreach ik in array array['TESTEXP', 'TESTOFF', 'TESTMIN', 'NOPE', ''' or 1=1 --', 'welcome10; drop table orders'] loop
    begin perform pg_temp.po(pg_temp.li(v_coho, '1'), code => ik); raise exception 'FAIL B15: code % accepted', ik;
    exception when invalid_parameter_value then null; end;
  end loop;
  perform pg_temp.po(pg_temp.li(v_coho, '1'), code => 'TESTMAX');
  begin perform pg_temp.po(pg_temp.li(v_coho, '1'), code => 'TESTMAX'); raise exception 'FAIL B15b: max_uses ignored';
  exception when invalid_parameter_value then null; end;
  tmp := pg_temp.po(pg_temp.li(v_coho, '1'), code => '  testfix ');
  if tmp.discount_cents <> 1200 or tmp.tax_cents <> 0 then raise exception 'FAIL B15c: fixed discount not capped at subtotal'; end if;
  ok := ok || 'B15 ';
  begin perform public.place_order(p_items => pg_temp.li(v_coho, '1'), p_email => 'x@y.dev', p_phone => null, p_address => '{"name":"n","line1":"l","city":"c"}', p_method => 'bank_transfer', p_token_hash => 'short', p_idempotency_key => repeat('k', 20), p_ip => null);
    raise exception 'FAIL B16: short token hash';
  exception when invalid_parameter_value then null; end;
  begin perform public.place_order(p_items => pg_temp.li(v_coho, '1'), p_email => 'x@y.dev', p_phone => null, p_address => '{"name":"n","line1":"l","city":"c"}', p_method => 'bank_transfer', p_token_hash => repeat('a', 64), p_idempotency_key => 'short', p_ip => null);
    raise exception 'FAIL B16b: short checkout key';
  exception when invalid_parameter_value then ok := ok || 'B16 '; end;
  perform pg_temp.po(pg_temp.li(v_tiny, '3'));  -- exactly the remaining stock
  if (select stock from public.products where id = p_tiny) <> 0 then raise exception 'FAIL B17: exact stock'; end if;
  begin perform pg_temp.po(pg_temp.li(v_tiny, '1')); raise exception 'FAIL B17b: oversold';
  exception when invalid_parameter_value then ok := ok || 'B17 '; end;
  n := (select stock from public.products where slug = 'hot-smoked-coho');
  perform pg_temp.po(pg_temp.li(v_coho3, '2'));
  if (select stock from public.products where slug = 'hot-smoked-coho') <> n - 6 then raise exception 'FAIL B18: pack units'; end if;
  ok := ok || 'B18 ';
  tmp := pg_temp.po(pg_temp.li(v_coho, '1'), note => repeat('x', 400));
  if length(tmp.gift_note) <> 250 then raise exception 'FAIL B19: gift note not truncated'; end if;
  ok := ok || 'B19 ';
  if tmp.number <= o.number then raise exception 'FAIL B20: order numbers'; end if;
  ok := ok || 'B20 ';

  /* ================= C. rate limits + blocklist (server) ================= */
  for x in 1..5 loop perform pg_temp.po(pg_temp.li(v_tuna, '1'), ip => '10.250.0.1'); end loop;
  begin perform pg_temp.po(pg_temp.li(v_tuna, '1'), ip => '10.250.0.1'); raise exception 'FAIL C1: 6th order from one IP';
  exception when sqlstate 'PT429' then ok := ok || 'C1 '; end;
  for x in 1..5 loop perform pg_temp.po(pg_temp.li(v_tuna, '1'), email => 'busy@test.dev'); end loop;
  begin perform pg_temp.po(pg_temp.li(v_tuna, '1'), email => 'busy@test.dev'); raise exception 'FAIL C2: 6th order from one email';
  exception when sqlstate 'PT429' then ok := ok || 'C2 '; end;
  for x in 1..3 loop perform pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923009999999'); end loop;
  begin perform pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923009999999'); raise exception 'FAIL C3: 4th COD from one phone';
  exception when sqlstate 'PT429' then ok := ok || 'C3 '; end;
  insert into public.blocked_contacts (kind, value) values ('ip', '10.66.6.6'), ('email', 'fraud@test.dev'), ('phone', '+923006666666');
  begin perform pg_temp.po(pg_temp.li(v_tuna, '1'), ip => '10.66.6.6'); raise exception 'FAIL C4: blocked IP';
  exception when insufficient_privilege then null; end;
  begin perform pg_temp.po(pg_temp.li(v_tuna, '1'), email => 'FRAUD@test.dev'); raise exception 'FAIL C4b: blocked email';
  exception when insufficient_privilege then null; end;
  begin perform pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923006666666'); raise exception 'FAIL C4c: blocked phone';
  exception when insufficient_privilege then ok := ok || 'C4 '; end;
  ik := 'retry-' || gen_random_uuid();
  tmp := pg_temp.po(pg_temp.li(v_tuna, '1'), ip => '10.251.0.1', ikey => ik);
  for x in 1..4 loop perform pg_temp.po(pg_temp.li(v_tuna, '1'), ip => '10.251.0.1'); end loop;   -- IP now at its limit
  if (pg_temp.po(pg_temp.li(v_tuna, '1'), ip => '10.251.0.1', ikey => ik)).id <> tmp.id then raise exception 'FAIL C5: retry blocked by rate limit'; end if;
  ok := ok || 'C5 ';
  for x in 1..3 loop perform public.check_rate_limit('newsletter:ip:1.2.3.4', 3, 3600); end loop;
  begin perform public.check_rate_limit('newsletter:ip:1.2.3.4', 3, 3600); raise exception 'FAIL C6: generic limiter';
  exception when sqlstate 'PT429' then ok := ok || 'C6 '; end;

  /* ================= D. customers ================= */
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select count(*) from public.orders where id = o.id) + (select count(*) from public.order_items where order_id = o.id) <> 0 then raise exception 'FAIL D1: B sees A''s order'; end if;
  ok := ok || 'D1 ';
  begin insert into public.admins (user_id) values (b); raise exception 'FAIL D6: self-promotion to admin';
  exception when insufficient_privilege then ok := ok || 'D6 '; end;
  update public.profiles set full_name = 'hacked' where id = a;
  reset role;
  if (select full_name from public.profiles where id = a) is not distinct from 'hacked' then raise exception 'FAIL D7: B edited A''s profile'; end if;
  ok := ok || 'D7 ';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select count(*) from public.orders where id = o.id) <> 1 or (select count(*) from public.order_items where order_id = o.id) <> 1 then raise exception 'FAIL D2: A cannot see own order'; end if;
  ok := ok || 'D2 ';
  update public.orders set status = 'confirmed', total_cents = 1 where id = o.id;
  delete from public.orders where id = o.id;
  if (select status from public.orders where id = o.id) <> 'awaiting_payment' then raise exception 'FAIL D3: customer edited/deleted order'; end if;
  ok := ok || 'D3 ';
  begin insert into public.orders (public_token_hash, email, shipping_address, payment_method, status, payment_status, currency, subtotal_cents, total_cents)
    values (repeat('b', 64), 'a@test.dev', '{}', 'bank_transfer', 'confirmed', 'paid', 'USD', 0, 0);
    raise exception 'FAIL D4: customer inserted an order';
  exception when insufficient_privilege then ok := ok || 'D4 '; end;
  begin perform public.transition_order(o.id, 'confirmed'); raise exception 'FAIL D5: transition_order';
  exception when insufficient_privilege then null; end;
  begin perform public.review_payment_proof(gen_random_uuid(), true); raise exception 'FAIL D5b: review_payment_proof';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_stats(); raise exception 'FAIL D5c: admin_stats';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_settings(); raise exception 'FAIL D5d: admin_settings';
  exception when insufficient_privilege then ok := ok || 'D5 '; end;
  update public.profiles set full_name = 'Alice' where id = a;
  if (select full_name from public.profiles where id = a) <> 'Alice' then raise exception 'FAIL D7b: own profile not editable'; end if;
  if (select count(*) from public.order_events) + (select count(*) from public.payment_proofs) + (select count(*) from public.notifications) <> 0 then raise exception 'FAIL D8: customer sees admin-only tables'; end if;
  ok := ok || 'D8 ';
  update public.variants set price_cents = 1 where id = v_coho;
  if (select price_cents from public.variants where id = v_coho) <> 1200 then raise exception 'FAIL D9: customer changed a price'; end if;
  ok := ok || 'D9 ';
  if (select count(*) from public.discount_codes) <> 0 then raise exception 'FAIL D10: customer sees codes'; end if;
  ok := ok || 'D10 ';
  begin insert into storage.objects (bucket_id, name) values ('product-images', 'x.png'); raise exception 'FAIL D11: customer uploaded product image';
  exception when insufficient_privilege then ok := ok || 'D11 '; end;
  reset role;

  /* ================= E. admin ================= */
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin update public.orders set status = 'confirmed' where id = o.id; raise exception 'FAIL E1: admin bypassed state machine';
  exception when insufficient_privilege then null; end;
  begin update public.orders set total_cents = 1 where id = o.id; raise exception 'FAIL E1b: admin edited total';
  exception when insufficient_privilege then null; end;
  update public.orders set gift_note = 'fixed typo' where id = o.id;
  if (select gift_note from public.orders where id = o.id) <> 'fixed typo' then raise exception 'FAIL E1c: admin cannot edit notes'; end if;
  ok := ok || 'E1 ';
  begin perform public.transition_order(o.id, 'payment_review'); raise exception 'FAIL E2: admin forced payment_review';
  exception when invalid_parameter_value then ok := ok || 'E2 '; end;
  begin perform public.transition_order(o.id, 'dispatched'); raise exception 'FAIL E3: awaiting_payment -> dispatched';
  exception when invalid_parameter_value then ok := ok || 'E3 '; end;
  if (select count(*) from public.discount_codes) < 8 or (public.admin_settings()).bank_details = '{}'::jsonb
     or not (public.admin_stats() ?& array['revenue_cents', 'orders', 'daily', 'low_stock']) then
    raise exception 'FAIL E4: admin reads';
  end if;
  ok := ok || 'E4 ';
  insert into public.products (slug, name, status) values ('admin-made', 'Admin Made', 'active');
  update public.products set name = 'Renamed' where slug = 'admin-made';
  delete from public.products where slug = 'admin-made';
  insert into public.blocked_contacts (kind, value, created_by) values ('email', 'bad@test.dev', adm);
  ok := ok || 'E5 ';
  if (select count(*) from public.action_tokens) + (select count(*) from public.rate_limits) <> 0 then raise exception 'FAIL E7: admin reads server-only tables'; end if;
  ok := ok || 'E7 ';
  reset role;

  /* ================= F. bank-transfer proofs ================= */
  perform set_config('request.jwt.claims', sv, true);
  begin perform public.submit_payment_proof(pg_temp.h('tok-a'), gen_random_uuid()::text || '/x.jpg'); raise exception 'FAIL F1: proof path outside order folder';
  exception when invalid_parameter_value then ok := ok || 'F1 '; end;
  begin perform public.submit_payment_proof(pg_temp.h('nope'), 'x/x.jpg'); raise exception 'FAIL F2: unknown order link';
  exception when no_data_found then ok := ok || 'F2 '; end;
  o := public.submit_payment_proof(pg_temp.h('tok-a'), o.id::text || '/proof1.jpg');
  if o.status <> 'payment_review' or o.payment_status <> 'under_review' then raise exception 'FAIL F3: review not started'; end if;
  ok := ok || 'F3 ';
  begin perform public.submit_payment_proof(pg_temp.h('tok-a'), o.id::text || '/proof2.jpg'); raise exception 'FAIL F4: second upload during review';
  exception when invalid_parameter_value then ok := ok || 'F4 '; end;
  o2 := pg_temp.po(pg_temp.li(v_tuna, '1'), uid => b, tok => 'tok-b');
  o2 := public.submit_payment_proof(pg_temp.h('tok-b'), o2.id::text || '/p.png');

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select id into pr from public.payment_proofs where order_id = o.id;
  begin perform public.review_payment_proof(pr, false, '  '); raise exception 'FAIL F5: reject without reason';
  exception when invalid_parameter_value then ok := ok || 'F5 '; end;
  o := public.review_payment_proof(pr, false, 'Amount does not match');
  if o.status <> 'awaiting_payment' or o.payment_status <> 'rejected' or o.expires_at < now() + interval '47 hours' then raise exception 'FAIL F6: rejection state'; end if;
  ok := ok || 'F6 ';
  reset role;
  perform set_config('request.jwt.claims', sv, true);
  o := public.submit_payment_proof(pg_temp.h('tok-a'), o.id::text || '/proof2.jpg');
  if o.status <> 'payment_review' or (select count(*) from public.payment_proofs where order_id = o.id) <> 2 then raise exception 'FAIL F7: re-upload'; end if;
  ok := ok || 'F7 ';
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.transition_order(o.id, 'confirmed'); raise exception 'FAIL F7b: confirmed without reviewing the proof';
  exception when invalid_parameter_value then null; end;
  select id into pr from public.payment_proofs where order_id = o.id and status = 'pending';
  o := public.review_payment_proof(pr, true, null, ' TXN-1 ');
  if o.status <> 'confirmed' or o.payment_status <> 'paid' or o.transaction_ref <> 'TXN-1' then raise exception 'FAIL F8: approval'; end if;
  ok := ok || 'F8 ';
  begin perform public.review_payment_proof(pr, false, 'changed my mind'); raise exception 'FAIL F9: proof reviewed twice';
  exception when invalid_parameter_value then ok := ok || 'F9 '; end;
  select id into pr from public.payment_proofs where order_id = o2.id;
  begin perform public.review_payment_proof(pr, true, null, 'TXN-1'); raise exception 'FAIL F10: one bank transfer approved two orders';
  exception when unique_violation then ok := ok || 'F10 '; end;
  reset role;
  perform set_config('request.jwt.claims', sv, true);
  begin perform public.submit_payment_proof(pg_temp.h('tok-a'), o.id::text || '/late.jpg'); raise exception 'FAIL F11: proof on paid order';
  exception when invalid_parameter_value then ok := ok || 'F11 '; end;

  /* ================= G. cash-on-delivery confirmation ================= */
  insert into public.action_tokens (token_hash, order_id, purpose, expires_at) values
    (pg_temp.h('cod-yes'), oc.id, 'cod_confirm', now() + interval '1 day');
  begin perform public.respond_to_order(pg_temp.h('nope'), true); raise exception 'FAIL G1: unknown link';
  exception when invalid_parameter_value then ok := ok || 'G1 '; end;
  o3 := pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923002222222');
  insert into public.action_tokens (token_hash, order_id, purpose, expires_at) values (pg_temp.h('cod-old'), o3.id, 'cod_confirm', now() - interval '1 minute');
  begin perform public.respond_to_order(pg_temp.h('cod-old'), true); raise exception 'FAIL G2: expired link';
  exception when invalid_parameter_value then ok := ok || 'G2 '; end;
  oc := public.respond_to_order(pg_temp.h('cod-yes'), true);
  if oc.status <> 'confirmed' or oc.payment_status <> 'cod_pending' then raise exception 'FAIL G3: COD confirm'; end if;
  begin perform public.respond_to_order(pg_temp.h('cod-yes'), false); raise exception 'FAIL G3b: link replayed';
  exception when invalid_parameter_value then ok := ok || 'G3 '; end;
  n := (select stock from public.products where slug = 'albacore-chili-oil');
  insert into public.action_tokens (token_hash, order_id, purpose, expires_at) values (pg_temp.h('cod-no'), o3.id, 'cod_confirm', now() + interval '1 day');
  o3 := public.respond_to_order(pg_temp.h('cod-no'), false);
  if o3.status <> 'cancelled' or (select stock from public.products where slug = 'albacore-chili-oil') <> n + 1 then raise exception 'FAIL G4: COD decline'; end if;
  ok := ok || 'G4 ';
  o3 := pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923003333333');
  insert into public.action_tokens (token_hash, order_id, purpose, expires_at) values (pg_temp.h('cod-late'), o3.id, 'cod_confirm', now() + interval '1 day');
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.transition_order(o3.id, 'cancelled', 'no answer on phone');
  reset role;
  perform set_config('request.jwt.claims', sv, true);
  begin perform public.respond_to_order(pg_temp.h('cod-late'), true); raise exception 'FAIL G5: confirmed a cancelled order';
  exception when invalid_parameter_value then null; end;
  if (select used_at from public.action_tokens where token_hash = pg_temp.h('cod-late')) is not null then raise exception 'FAIL G5b: failed answer burned the link'; end if;
  ok := ok || 'G5 ';

  /* ================= H. fulfilment + stock ================= */
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  oc := public.transition_order(oc.id, 'packed');
  oc := public.transition_order(oc.id, 'dispatched', null, '{"courier":"DemoEx","tracking_number":"TRK-1"}');
  begin perform public.transition_order(oc.id, 'cancelled'); raise exception 'FAIL H4: cancelled a dispatched order';
  exception when invalid_parameter_value then ok := ok || 'H4 '; end;
  oc := public.transition_order(oc.id, 'delivered');
  if oc.status <> 'delivered' or oc.payment_status <> 'cod_collected' or oc.tracking_number <> 'TRK-1' then raise exception 'FAIL H1: COD fulfilment'; end if;
  ok := ok || 'H1 ';
  n := (select stock from public.products where slug = 'albacore-chili-oil');
  o2 := public.transition_order(o2.id, 'cancelled');
  if (select stock from public.products where slug = 'albacore-chili-oil') <> n + 1 then raise exception 'FAIL H2: cancel release'; end if;
  begin perform public.transition_order(o2.id, 'cancelled'); raise exception 'FAIL H2b: cancelled twice';
  exception when invalid_parameter_value then null; end;
  if (select stock from public.products where slug = 'albacore-chili-oil') <> n + 1 then raise exception 'FAIL H2c: stock released twice'; end if;
  ok := ok || 'H2 ';
  n := (select stock from public.products where slug = 'albacore-chili-oil');
  oc := public.transition_order(oc.id, 'returned', 'damaged tin');
  if (select stock from public.products where slug = 'albacore-chili-oil') <> n + 1 then raise exception 'FAIL H3: return release'; end if;
  ok := ok || 'H3 ';
  if (select count(distinct actor_kind) from public.order_events where order_id in (o.id, oc.id)) < 2 then raise exception 'FAIL H5: audit trail'; end if;
  ok := ok || 'H5 ';
  reset role;

  /* ================= I. expiry job ================= */
  perform set_config('request.jwt.claims', sv, true);
  tmp := pg_temp.po(pg_temp.li(v_tuna, '1'));
  o3 := pg_temp.po(pg_temp.li(v_tuna, '1'), method => 'cod', phone => '+923004444444');
  o2 := pg_temp.po(pg_temp.li(v_tuna, '1'), tok => 'tok-review');
  o2 := public.submit_payment_proof(pg_temp.h('tok-review'), o2.id::text || '/r.jpg');
  update public.orders set expires_at = now() - interval '1 minute' where id in (tmp.id, o3.id, o2.id);
  n := (select stock from public.products where slug = 'albacore-chili-oil');
  perform private.expire_stale_orders();
  if (select status from public.orders where id = tmp.id) <> 'cancelled' then raise exception 'FAIL I1: unpaid order not expired'; end if;
  if (select status from public.orders where id = o3.id) <> 'cancelled' then raise exception 'FAIL I2: unconfirmed COD not expired'; end if;
  if (select status from public.orders where id = o2.id) <> 'payment_review' then raise exception 'FAIL I3: order under review was expired'; end if;
  if (select stock from public.products where slug = 'albacore-chili-oil') <> n + 2 then raise exception 'FAIL I4: expiry did not release stock'; end if;
  if (select status from public.orders where id = o.id) <> 'confirmed' then raise exception 'FAIL I5: confirmed order touched'; end if;
  ok := ok || 'I1-5 ';

  /* ================= J. reviews ================= */
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.reviews (product_id, user_id, rating, body) select id, a, 5, 'Great' from public.products where slug = 'hot-smoked-coho';
  begin insert into public.reviews (product_id, user_id, rating, body) select id, a, 4, 'Again' from public.products where slug = 'hot-smoked-coho'; raise exception 'FAIL J4: duplicate review';
  exception when unique_violation then null; end;
  begin insert into public.reviews (product_id, user_id, rating, body) select id, b, 1, 'As B' from public.products where slug = 'hot-smoked-coho'; raise exception 'FAIL J5: review as someone else';
  exception when insufficient_privilege then null; end;
  begin insert into public.reviews (product_id, user_id, rating, body) select id, a, 6, 'Six' from public.products where slug = 'hot-smoked-coho'; raise exception 'FAIL J6: rating 6';
  exception when check_violation or insufficient_privilege then null; end;
  begin insert into public.reviews (product_id, user_id, rating, body, status) select id, a, 5, 'Self-approved', 'approved' from public.products where slug = 'hot-smoked-coho';
    raise exception 'FAIL J7: self-approved review';
  exception when insufficient_privilege then null; end;
  ok := ok || 'J1 J4-7 ';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.reviews (product_id, user_id, rating, body) select id, b, 1, 'Never bought' from public.products where slug = 'hot-smoked-coho'; raise exception 'FAIL J2: non-buyer review';
  exception when insufficient_privilege then ok := ok || 'J2 '; end;
  reset role;
  perform set_config('request.jwt.claims', ab, true);
  set local role anon;
  if (select count(*) from public.reviews) <> 0 then raise exception 'FAIL J3: pending review public'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.reviews set status = 'approved' where user_id = a;
  reset role;
  perform set_config('request.jwt.claims', ab, true);
  set local role anon;
  if (select count(*) from public.reviews) <> 1 then raise exception 'FAIL J3b: approved review not public'; end if;
  ok := ok || 'J3 ';
  reset role;

  /* ================= K. guest order link ================= */
  perform set_config('request.jwt.claims', sv, true);
  j := public.get_order_by_token(pg_temp.h('tok-a'));
  if j -> 'order' ? 'public_token_hash' or j -> 'order' ? 'user_id' or j -> 'order' ? 'client_ip' or j -> 'order' ? 'idempotency_key' or j -> 'bank_details' = 'null'::jsonb then
    raise exception 'FAIL K1: order link payload %', j;
  end if;
  if (public.get_order_by_token(pg_temp.h('tok-cod'))) -> 'bank_details' <> 'null'::jsonb then raise exception 'FAIL K1b: bank details on COD order'; end if;
  if public.get_order_by_token(pg_temp.h('nope')) is not null then raise exception 'FAIL K2: unknown link returned data'; end if;
  ok := ok || 'K1 K2 ';

  cnt := array_length(string_to_array(trim(ok), ' '), 1);
  raise exception 'ALL PASS (% groups): %', cnt, ok;
end $$;
