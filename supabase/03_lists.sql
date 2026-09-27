create table if not exists lists (
  id text primary key default gen_random_uuid()::text,
  name text default 'Ma liste',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists list_items (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  ean text,
  name text not null,
  name_he text,
  emoji text,
  category text,
  unit text,
  qty numeric not null default 1,
  chain text,
  price numeric,
  checked boolean not null default false,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_list_items_list on list_items (list_id);

alter table lists enable row level security;
alter table list_items enable row level security;

drop policy if exists anon_all_lists on lists;
create policy anon_all_lists on lists for all to anon using (true) with check (true);

drop policy if exists anon_all_list_items on list_items;
create policy anon_all_list_items on list_items for all to anon using (true) with check (true);

alter publication supabase_realtime add table lists;
alter publication supabase_realtime add table list_items;
