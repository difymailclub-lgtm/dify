-- Core schema: catalog, orders (bank transfer + cash on delivery), payments proofs, notifications.
-- Money is stored in integer cents. Internal helpers live in the non-exposed `private` schema.

create schema if not exists private;

create type public.product_status as enum ('draft', 'active', 'archived');
create type public.payment_method as enum ('bank_transfer', 'cod');
create type public.order_status as enum (
  'awaiting_payment', 'payment_review', 'awaiting_confirmation',
  'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned'
);
create type public.payment_status as enum (
  'unpaid', 'under_review', 'paid', 'rejected', 'cod_pending', 'cod_collected', 'refunded'
);
create type public.discount_type as enum ('percent', 'fixed', 'free_shipping');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.proof_status as enum ('pending', 'approved', 'rejected');

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

/* ---------- People ---------- */
-- Admin membership is its own table with NO write policies: only the service role can grant admin.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (length(full_name) <= 120),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

/* ---------- Catalog ---------- */
create table public.collections (
  handle text primary key check (handle ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (length(title) between 1 and 80),
  blurb text not null default '',
  color text,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (length(name) between 1 and 200),
  description text not null default '' check (length(description) <= 5000),
  status public.product_status not null default 'draft',
  badge text check (length(badge) <= 40),
  species text,
  origin text,
  nutrition jsonb not null default '{}',
  art text,
  colors text[] not null default '{}',
  image_path text,
  stock int check (stock >= 0), -- counted in single tins; null = not tracked
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  units int not null default 1 check (units between 1 and 100), -- tins consumed from stock per unit sold
  gift_tin boolean not null default false,
  price_cents int not null check (price_cents >= 0),
  compare_at_cents int check (compare_at_cents >= 0),
  sku text unique,
  sort_order int not null default 0,
  unique (product_id, units, gift_tin)
);
create index variants_product_idx on public.variants (product_id);

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection text not null references public.collections (handle) on update cascade on delete cascade,
  primary key (product_id, collection)
);
create index product_collections_collection_idx on public.product_collections (collection);

/* ---------- Store settings (single row) ---------- */
create table public.settings (
  id boolean primary key default true check (id),
  currency text not null default 'USD',
  free_ship_threshold_cents int not null default 7500 check (free_ship_threshold_cents >= 0),
  shipping_flat_cents int not null default 895 check (shipping_flat_cents >= 0),
  tax_rate numeric(5, 4) not null default 0.08 check (tax_rate between 0 and 1),
  low_stock_threshold int not null default 15,
  announcements text[] not null default '{}',
  bank_transfer_enabled boolean not null default true,
  bank_details jsonb not null default '{}', -- not publicly selectable (column grants in RLS migration)
  cod_enabled boolean not null default true,
  cod_max_total_cents int check (cod_max_total_cents >= 0),
  unpaid_expiry_hours int not null default 48 check (unpaid_expiry_hours > 0),
  cod_confirm_expiry_hours int not null default 24 check (cod_confirm_expiry_hours > 0),
  updated_at timestamptz not null default now()
);
create trigger settings_touch before update on public.settings for each row execute function private.touch_updated_at();

create table public.discount_codes (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,32}$'),
  type public.discount_type not null,
  value int not null default 0 check (value >= 0), -- percent (1-100) or cents
  label text not null default '',
  active boolean not null default true,
  max_uses int check (max_uses > 0),
  uses int not null default 0,
  min_subtotal_cents int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (type <> 'percent' or value between 1 and 100)
);

/* ---------- Orders ---------- */
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  user_id uuid references auth.users (id) on delete set null,
  public_token_hash text not null unique, -- sha256 of the secret link token; the raw token is never stored
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_opt_in boolean not null default false,
  marketing_opt_in boolean not null default false,
  shipping_address jsonb not null,
  payment_method public.payment_method not null,
  status public.order_status not null,
  payment_status public.payment_status not null,
  currency text not null,
  subtotal_cents int not null check (subtotal_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  discount_code text references public.discount_codes (code) on update cascade on delete set null,
  gift_note text check (length(gift_note) <= 250),
  courier text,
  tracking_number text,
  transaction_ref text,
  expires_at timestamptz,
  stock_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payment_method <> 'cod' or phone is not null)
);
create index orders_status_idx on public.orders (status);
create index orders_user_idx on public.orders (user_id);
create index orders_created_idx on public.orders (created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where status in ('awaiting_payment', 'awaiting_confirmation');
create trigger orders_touch before update on public.orders for each row execute function private.touch_updated_at();

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.variants (id) on delete set null,
  name text not null,           -- snapshot at purchase time
  variant_title text,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity between 1 and 99),
  units int not null check (units >= 1)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  type text not null,
  from_status public.order_status,
  to_status public.order_status,
  note text,
  actor_id uuid references auth.users (id) on delete set null,
  actor_kind text not null check (actor_kind in ('customer', 'admin', 'system')),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  file_path text not null unique,
  status public.proof_status not null default 'pending',
  transaction_ref text,
  reject_reason text check (length(reject_reason) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index payment_proofs_order_idx on public.payment_proofs (order_id);
-- the same bank transaction can't approve two orders
create unique index payment_proofs_txn_once on public.payment_proofs (transaction_ref) where status = 'approved' and transaction_ref is not null;

-- one-time links (COD confirm/cancel). Only hashes stored.
create table public.action_tokens (
  token_hash text primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  purpose text not null check (purpose in ('cod_confirm')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index action_tokens_order_idx on public.action_tokens (order_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  order_id uuid references public.orders (id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  template text not null,
  recipient text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_order_idx on public.notifications (order_id);

/* ---------- Community ---------- */
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text check (length(title) <= 120),
  body text not null check (length(body) between 1 and 2000),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews (product_id) where status = 'approved';

create table public.subscribers (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  source text check (length(source) <= 40),
  created_at timestamptz not null default now()
);

/* ---------- New user -> profile ---------- */
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, left(new.raw_user_meta_data ->> 'full_name', 120));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
