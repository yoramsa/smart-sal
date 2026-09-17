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
