-- Generated from src/data.js. Idempotent.
begin;
insert into public.settings (id, currency, free_ship_threshold_cents, shipping_flat_cents, tax_rate, low_stock_threshold, announcements, bank_details)
values (true, 'USD', 7500, 895, 0.08, 15, array['Free shipping on orders $75+', 'Build a box of 6, 9 or 12 tins and save up to 20%', 'Refer a friend, you both get 20% off', 'Gift notes available at checkout'],
  '{"bank":"Demo Bank","account_title":"Brinebird Foods (demo)","account_number":"0000-0000000-00","iban":"XX00 DEMO 0000 0000 0000 00","instructions":"Use your order number as the payment reference, then upload a screenshot of the transfer."}'::jsonb)
on conflict (id) do nothing;
insert into public.collections (handle, title, blurb, color, sort_order) values ('tinned-fish', 'Tinned Fish', 'Responsibly sourced, chef-seasoned, ready the second you open the lid.', '#73c3f5', 0) on conflict (handle) do nothing;
insert into public.collections (handle, title, blurb, color, sort_order) values ('best-sellers', 'Best Sellers', 'The tins everyone keeps coming back for.', '#fdcd62', 1) on conflict (handle) do nothing;
insert into public.collections (handle, title, blurb, color, sort_order) values ('gifts', 'Gifts', 'Gifts for the person who has everything except a great tin of fish.', '#c7e0c3', 2) on conflict (handle) do nothing;
insert into public.collections (handle, title, blurb, color, sort_order) values ('bundles', 'Bundles', 'More tins, less per tin.', '#f04a49', 3) on conflict (handle) do nothing;
insert into public.collections (handle, title, blurb, color, sort_order) values ('merch', 'Merch', 'Wear the fish. Serve the fish.', '#fff7e9', 4) on conflict (handle) do nothing;
insert into public.collections (handle, title, blurb, color, sort_order) values ('new', 'New Arrivals', 'Fresh out of the cannery.', '#fdcd62', 5) on conflict (handle) do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('hot-smoked-coho', 'Hot-Smoked Coho Salmon', 'Coho salmon brined lightly, smoked over alder, then packed in olive oil. Flaky, rich and gently smoky — the tin that converts skeptics.', 'active', 'Best Seller', 'Salmon', 'Pacific Northwest', '{"protein_g":21,"omega3_g":1.6,"mercury":"Very low"}'::jsonb, null, array['#f04a49', '#fdcd62'], 100, 0)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1200, null, 'hot-smoked-coho-1', 0 from public.products where slug = 'hot-smoked-coho'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 3240, 3600, 'hot-smoked-coho-3', 1 from public.products where slug = 'hot-smoked-coho'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 6120, 7200, 'hot-smoked-coho-6', 2 from public.products where slug = 'hot-smoked-coho'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'hot-smoked-coho' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'best-sellers' from public.products where slug = 'hot-smoked-coho' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('coho-black-garlic', 'Coho Salmon with Black Garlic Oil', 'Our smoked coho finished with slow-roasted black garlic oil. Sweet, savory, a little molasses-y. Spoon it over hot rice.', 'active', 'New', 'Salmon', 'Pacific Northwest', '{"protein_g":20,"omega3_g":1.5,"mercury":"Very low"}'::jsonb, null, array['#272d45', '#c7e0c3'], 100, 1)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1400, null, 'coho-black-garlic-1', 0 from public.products where slug = 'coho-black-garlic'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 3780, 4200, 'coho-black-garlic-3', 1 from public.products where slug = 'coho-black-garlic'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 7140, 8400, 'coho-black-garlic-6', 2 from public.products where slug = 'coho-black-garlic'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'coho-black-garlic' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'new' from public.products where slug = 'coho-black-garlic' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('albacore-chili-oil', 'Albacore in Calabrian Chili Oil', 'Pole-caught young albacore, hand-packed raw and cooked once in the tin with fruity chili oil. Big chunks, real heat.', 'active', null, 'Tuna', 'Oregon Coast', '{"protein_g":24,"omega3_g":1.1,"mercury":"Low"}'::jsonb, null, array['#fdcd62', '#f04a49'], 100, 2)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1300, null, 'albacore-chili-oil-1', 0 from public.products where slug = 'albacore-chili-oil'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 3510, 3900, 'albacore-chili-oil-3', 1 from public.products where slug = 'albacore-chili-oil'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 6630, 7800, 'albacore-chili-oil-6', 2 from public.products where slug = 'albacore-chili-oil'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'albacore-chili-oil' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'best-sellers' from public.products where slug = 'albacore-chili-oil' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('sardines-orange-fennel', 'Sardines with Orange & Fennel', 'Plump Galician sardines with sweet orange peel and toasted fennel seed. Bright enough for breakfast toast.', 'active', null, 'Sardines', 'Galicia, Spain', '{"protein_g":19,"omega3_g":1.9,"mercury":"Very low"}'::jsonb, null, array['#73c3f5', '#fdcd62'], 100, 3)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 900, null, 'sardines-orange-fennel-1', 0 from public.products where slug = 'sardines-orange-fennel'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 2430, 2700, 'sardines-orange-fennel-3', 1 from public.products where slug = 'sardines-orange-fennel'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 4590, 5400, 'sardines-orange-fennel-6', 2 from public.products where slug = 'sardines-orange-fennel'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'sardines-orange-fennel' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('anchovies-evoo', 'Cured Anchovy Fillets in EVOO', 'Salt-cured for months and hand-filleted. Meaty, buttery, not too salty. Drape over butter and bread and call it dinner.', 'active', null, 'Anchovies', 'Bay of Biscay', '{"protein_g":25,"omega3_g":2,"mercury":"Very low"}'::jsonb, null, array['#010101', '#fdcd62'], 12, 4)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1600, null, 'anchovies-evoo-1', 0 from public.products where slug = 'anchovies-evoo'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 4320, 4800, 'anchovies-evoo-3', 1 from public.products where slug = 'anchovies-evoo'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 8160, 9600, 'anchovies-evoo-6', 2 from public.products where slug = 'anchovies-evoo'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'anchovies-evoo' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'best-sellers' from public.products where slug = 'anchovies-evoo' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('mackerel-peppercorn', 'Smoked Mackerel with Pink Peppercorn', 'Oak-smoked mackerel with crushed pink peppercorn. Floral, smoky, deeply rich — the omega-3 heavyweight.', 'active', null, 'Mackerel', 'North Atlantic', '{"protein_g":18,"omega3_g":2.4,"mercury":"Low"}'::jsonb, null, array['#c7e0c3', '#387cc0'], 100, 5)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1000, null, 'mackerel-peppercorn-1', 0 from public.products where slug = 'mackerel-peppercorn'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 2700, 3000, 'mackerel-peppercorn-3', 1 from public.products where slug = 'mackerel-peppercorn'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 5100, 6000, 'mackerel-peppercorn-6', 2 from public.products where slug = 'mackerel-peppercorn'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'mackerel-peppercorn' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('mussels-saffron', 'Mussels in Saffron Escabeche', 'Rope-grown mussels fried then pickled in a saffron-paprika escabeche. Tangy, golden, and perfect with chips.', 'active', 'New', 'Mussels', 'Galicia, Spain', '{"protein_g":15,"omega3_g":0.8,"mercury":"Very low"}'::jsonb, null, array['#fdcd62', '#272d45'], 100, 6)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1100, null, 'mussels-saffron-1', 0 from public.products where slug = 'mussels-saffron'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '3-Pack', 3, false, 2970, 3300, 'mussels-saffron-3', 1 from public.products where slug = 'mussels-saffron'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, '6-Pack', 6, false, 5610, 6600, 'mussels-saffron-6', 2 from public.products where slug = 'mussels-saffron'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'tinned-fish' from public.products where slug = 'mussels-saffron' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'new' from public.products where slug = 'mussels-saffron' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('starter-trio', 'The First Tin Trio', 'Three of our most-loved tins in one box: hot-smoked coho, chili albacore and orange-fennel sardines. The ideal first date with tinned fish.', 'active', 'Save 10%', 'Mixed', 'Various', '{"protein_g":21,"omega3_g":1.6,"mercury":"Very low"}'::jsonb, 'stack', array['#387cc0', '#fdcd62'], 100, 7)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 3300, null, 'starter-trio-1', 0 from public.products where slug = 'starter-trio'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single with Gift Tin', 1, true, 4300, null, 'starter-trio-1-gift', 1 from public.products where slug = 'starter-trio'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'bundles' from public.products where slug = 'starter-trio' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'gifts' from public.products where slug = 'starter-trio' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'best-sellers' from public.products where slug = 'starter-trio' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('dinner-party-box', 'The Dinner Party Box', 'Eight tins, a wooden serving board, and a folded card of pairing ideas. Unbox, open, impress.', 'active', 'Gift Ready', 'Mixed', 'Various', '{"protein_g":21,"omega3_g":1.6,"mercury":"Very low"}'::jsonb, 'box', array['#f04a49', '#73c3f5'], 100, 8)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 8900, null, 'dinner-party-box-1', 0 from public.products where slug = 'dinner-party-box'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single with Gift Tin', 1, true, 9900, null, 'dinner-party-box-1-gift', 1 from public.products where slug = 'dinner-party-box'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'bundles' from public.products where slug = 'dinner-party-box' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'gifts' from public.products where slug = 'dinner-party-box' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('countdown-calendar', 'Seven Seas Countdown Calendar', 'A seven-door calendar with a surprise behind every flap: tins, a tiny tin opener, and one sweet treat shaped like a fish.', 'active', 'Limited', 'Mixed', 'Various', '{"protein_g":21,"omega3_g":1.6,"mercury":"Very low"}'::jsonb, 'calendar', array['#010101', '#f04a49'], 7, 9)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 12000, null, 'countdown-calendar-1', 0 from public.products where slug = 'countdown-calendar'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single with Gift Tin', 1, true, 13000, null, 'countdown-calendar-1-gift', 1 from public.products where slug = 'countdown-calendar'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'gifts' from public.products where slug = 'countdown-calendar' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('serving-fork', 'Brass Tin Fork', 'A slim two-prong brass fork sized to reach every corner of a tin. Ages into a warm patina.', 'active', null, null, null, '{}'::jsonb, 'fork', array['#fdcd62', '#010101'], 100, 10)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 1800, null, 'serving-fork-1', 0 from public.products where slug = 'serving-fork'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single with Gift Tin', 1, true, 2800, null, 'serving-fork-1-gift', 1 from public.products where slug = 'serving-fork'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'merch' from public.products where slug = 'serving-fork' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'gifts' from public.products where slug = 'serving-fork' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('bucket-hat', 'Tide Pool Bucket Hat', 'Washed cotton canvas bucket hat with an embroidered sardine. One size fits most heads.', 'active', null, null, null, '{}'::jsonb, 'hat', array['#73c3f5', '#fff7e9'], 100, 11)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 3800, null, 'bucket-hat-1', 0 from public.products where slug = 'bucket-hat'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'merch' from public.products where slug = 'bucket-hat' on conflict do nothing;
insert into public.products (slug, name, description, status, badge, species, origin, nutrition, art, colors, stock, sort_order)
values ('cookbook', 'Open the Tin: A Cookbook', 'Sixty-plus recipes built around the pantry tin — from five-minute toasts to slow Sunday stews.', 'active', null, null, null, '{}'::jsonb, 'book', array['#c7e0c3', '#f04a49'], 0, 12)
on conflict (slug) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single', 1, false, 3000, null, 'cookbook-1', 0 from public.products where slug = 'cookbook'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.variants (product_id, title, units, gift_tin, price_cents, compare_at_cents, sku, sort_order)
select id, 'Single with Gift Tin', 1, true, 4000, null, 'cookbook-1-gift', 1 from public.products where slug = 'cookbook'
on conflict (product_id, units, gift_tin) do nothing;
insert into public.product_collections (product_id, collection) select id, 'merch' from public.products where slug = 'cookbook' on conflict do nothing;
insert into public.product_collections (product_id, collection) select id, 'gifts' from public.products where slug = 'cookbook' on conflict do nothing;
insert into public.discount_codes (code, type, value, label, active) values ('WELCOME10', 'percent', 10, '10% off your first order', true) on conflict (code) do nothing;
insert into public.discount_codes (code, type, value, label, active) values ('FISHY15', 'percent', 15, '15% off sitewide', true) on conflict (code) do nothing;
insert into public.discount_codes (code, type, value, label, active) values ('FREESHIP', 'free_shipping', 0, 'Free shipping', true) on conflict (code) do nothing;
commit;
