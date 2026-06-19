create table index_entries (
  card_id      uuid        primary key references cards(id) on delete cascade,
  user_id      uuid        not null references auth.users(id),
  title        text        not null default '',
  tags         text[]      not null default '{}',
  summary      text        not null default '',
  links        text[]      not null default '{}',
  content_hash text        not null default '',
  updated_at   timestamptz not null default now()
);

alter table index_entries enable row level security;

drop policy if exists "Users manage own index entries" on index_entries;
create policy "Users manage own index entries"
  on index_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
