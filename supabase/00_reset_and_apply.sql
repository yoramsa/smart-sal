-- SmartSal — remise à zéro (tables vides) + application du schéma versionné
-- À coller dans Supabase → SQL Editor → Run. Aucune donnée perdue (tables vides).

drop table if exists price_history cascade;
drop table if exists prices cascade;
drop table if exists product_equivalents cascade;
drop table if exists products cascade;
drop table if exists stores cascade;
drop table if exists sync_runs cascade;
drop function if exists record_price_change cascade;
drop function if exists touch_updated_at cascade;

-- ===== 01_tables.sql =====
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

-- ===== 02_trigger_rls.sql =====
create or replace function record_price_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into price_history (ean, store_id, old_price, new_price)
    values (new.ean, new.store_id, null, new.price);
    return new;
  end if;
  if (new.price is distinct from old.price) then
    insert into price_history (ean, store_id, old_price, new_price)
    values (new.ean, new.store_id, old.price, new.price);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prices_record_change on prices;
create trigger prices_record_change
before insert or update on prices
for each row execute function record_price_change();

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_touch_updated on products;
create trigger products_touch_updated
before update on products
for each row execute function touch_updated_at();

drop trigger if exists stores_touch_updated on stores;
create trigger stores_touch_updated
before update on stores
for each row execute function touch_updated_at();

alter table stores enable row level security;
alter table products enable row level security;
alter table prices enable row level security;
alter table price_history enable row level security;
alter table product_equivalents enable row level security;
alter table sync_runs enable row level security;

drop policy if exists anon_read_stores on stores;
create policy anon_read_stores on stores for select to anon using (true);

drop policy if exists anon_read_products on products;
create policy anon_read_products on products for select to anon using (true);

drop policy if exists anon_read_prices on prices;
create policy anon_read_prices on prices for select to anon using (true);

drop policy if exists anon_read_equivalents on product_equivalents;
create policy anon_read_equivalents on product_equivalents for select to anon using (true);
