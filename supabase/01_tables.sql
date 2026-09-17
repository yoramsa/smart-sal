create extension if not exists pg_trgm;

create table if not exists stores (
  id bigint generated always as identity primary key,
  chain text not null,
  chain_id text not null,
  subchain_id text,
  store_id text not null,
  name text,
  address text,
  city text,
  is_tracked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chain_id, store_id)
);

create table if not exists products (
  ean text primary key,
  name_he text,
  name_fr text,
  manufacturer text,
  unit text,
  unit_qty numeric,
  category text,
  emoji text,
  is_weighted boolean not null default false,
  store_brand_chain text,
  translated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prices (
  id bigint generated always as identity primary key,
  ean text not null references products(ean) on delete cascade,
  store_id bigint not null references stores(id) on delete cascade,
  price numeric not null,
  unit_price numeric,
  is_promo boolean not null default false,
  collected_at timestamptz not null default now(),
  unique (ean, store_id)
);

create table if not exists price_history (
  id bigint generated always as identity primary key,
  ean text not null,
  store_id bigint not null,
  old_price numeric,
  new_price numeric not null,
  changed_at timestamptz not null default now()
);

create table if not exists product_equivalents (
  id bigint generated always as identity primary key,
  group_id text not null,
  ean text not null references products(ean) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  unique (group_id, ean)
);

create table if not exists sync_runs (
  id bigint generated always as identity primary key,
  mode text not null,
  chain text,
  status text not null,
  message text,
  stores_seen integer not null default 0,
  products_upserted integer not null default 0,
  prices_upserted integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_prices_ean on prices (ean);
create index if not exists idx_prices_store on prices (store_id);
create index if not exists idx_prices_collected on prices (collected_at);
create index if not exists idx_products_translated on products (translated_at);
create index if not exists idx_products_category on products (category);
create index if not exists idx_products_name_fr_trgm on products using gin (name_fr gin_trgm_ops);
create index if not exists idx_products_name_he_trgm on products using gin (name_he gin_trgm_ops);
create index if not exists idx_stores_tracked on stores (is_tracked);
create index if not exists idx_equivalents_group on product_equivalents (group_id);
create index if not exists idx_history_ean_store on price_history (ean, store_id);
