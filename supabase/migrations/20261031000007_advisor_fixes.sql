-- Supabase advisor follow-ups.
-- is_admin() no longer needs SECURITY DEFINER: users can only see their own row in public.admins,
-- so running as the caller gives the same answer with less privilege.
create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

-- Accepted advisor warnings (by design, covered by supabase/tests/security.sql A7/D5):
-- transition_order, review_payment_proof, admin_settings, admin_stats are SECURITY DEFINER and callable
-- by `authenticated`, but each raises 42501 unless is_admin().

create index if not exists blocked_contacts_created_by_idx on public.blocked_contacts (created_by);
create index if not exists order_events_actor_idx on public.order_events (actor_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists orders_discount_code_idx on public.orders (discount_code);
create index if not exists payment_proofs_reviewed_by_idx on public.payment_proofs (reviewed_by);
create index if not exists reviews_user_idx on public.reviews (user_id);
