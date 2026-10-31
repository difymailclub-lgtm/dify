-- Storage buckets. SVG is not allowed (it can carry scripts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- product-images: public URLs for reading; only admins write. No select policy -> nobody can list the bucket.
create policy "admins upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));

-- payment-proofs: customers upload only through a server-issued signed upload URL; admins read via short-lived signed URLs.
create policy "admins read payment proofs" on storage.objects
  for select to authenticated using (bucket_id = 'payment-proofs' and (select public.is_admin()));

-- Cancel unpaid / unconfirmed orders past their window and release their stock.
create extension if not exists pg_cron;
select cron.schedule('expire-stale-orders', '*/15 * * * *', 'select private.expire_stale_orders()');
