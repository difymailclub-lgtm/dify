-- Row Level Security on every table. Server code uses service_role (bypasses RLS) only in Vercel functions.

do $$
declare t text;
begin
  foreach t in array array[
    'admins', 'profiles', 'collections', 'products', 'variants', 'product_collections', 'settings',
    'discount_codes', 'orders', 'order_items', 'order_events', 'payment_proofs', 'action_tokens',
    'notifications', 'reviews', 'subscribers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- RLS does not apply to TRUNCATE; nobody but the server needs it.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

/* ---------- Admin write access (insert/update/delete) on admin-managed tables ---------- */
do $$
declare t text;
begin
  foreach t in array array['collections', 'products', 'variants', 'product_collections', 'discount_codes'] loop
    execute format('create policy "admins insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "admins update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "admins delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

/* ---------- People ---------- */
create policy "read own admin row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "read own profile or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

/* ---------- Catalog (public read) ---------- */
create policy "anyone reads collections" on public.collections
  for select to anon, authenticated using (true);
create policy "anyone reads product collections" on public.product_collections
  for select to anon, authenticated using (true);
create policy "anyone reads active products" on public.products
  for select to anon, authenticated using (status = 'active' or (select public.is_admin()));
create policy "anyone reads variants of active products" on public.variants
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or (select public.is_admin())))
  );

/* ---------- Settings: public columns only; bank details via admin_settings() / get_order_by_token() ---------- */
create policy "anyone reads settings" on public.settings
  for select to anon, authenticated using (true);
create policy "admins update settings" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke select on public.settings from anon, authenticated;
grant select (
  id, currency, free_ship_threshold_cents, shipping_flat_cents, tax_rate, low_stock_threshold,
  announcements, bank_transfer_enabled, cod_enabled, cod_max_total_cents
) on public.settings to anon, authenticated;
revoke insert, delete on public.settings from anon, authenticated;

/* ---------- Discount codes: admins only (customers never see codes) ---------- */
create policy "admins read discount codes" on public.discount_codes
  for select to authenticated using ((select public.is_admin()));

/* ---------- Orders: owner or admin can read; nobody inserts from the browser ---------- */
create policy "read own orders or admin" on public.orders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
-- admins may fix e.g. an address typo; status/money changes are blocked by the guard trigger
create policy "admins update orders" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "read own order items or admin" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin())))
  );

create policy "admins read order events" on public.order_events
  for select to authenticated using ((select public.is_admin()));
create policy "admins read payment proofs" on public.payment_proofs
  for select to authenticated using ((select public.is_admin()));
create policy "admins read notifications" on public.notifications
  for select to authenticated using ((select public.is_admin()));
-- action_tokens: no policies at all -> only the server (service_role) can touch them.

/* ---------- Reviews: verified buyers write, everyone reads approved ---------- */
create policy "read approved, own, or admin reviews" on public.reviews
  for select to anon, authenticated using (
    status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin())
  );
create policy "verified buyers write reviews" on public.reviews
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
      where o.user_id = (select auth.uid()) and i.product_id = reviews.product_id
        and o.status in ('confirmed', 'packed', 'dispatched', 'delivered')
    )
  );
create policy "admins moderate reviews" on public.reviews
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete reviews" on public.reviews
  for delete to authenticated using ((select public.is_admin()));

/* ---------- Newsletter: anyone can subscribe, only admins can read ---------- */
create policy "anyone subscribes" on public.subscribers
  for insert to anon, authenticated with check (true);
create policy "admins read subscribers" on public.subscribers
  for select to authenticated using ((select public.is_admin()));
