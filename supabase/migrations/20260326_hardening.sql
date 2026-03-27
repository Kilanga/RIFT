-- RIFT / Supabase hardening (compatible with current client)
-- Apply in Supabase SQL Editor or CLI migration.

-- 0) Safety: extension for UUID/random helpers
create extension if not exists pgcrypto;

-- 1) game_rooms: shape constraints + performance indexes
alter table if exists public.game_rooms
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_game_rooms_updated_at on public.game_rooms;
create trigger trg_game_rooms_updated_at
before update on public.game_rooms
for each row execute function public.set_updated_at();

do $$
begin
  if to_regclass('public.game_rooms') is null then
    raise notice 'Table public.game_rooms not found: skipping game_rooms constraints/policies.';
    return;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_rooms_code_format_chk') then
    alter table public.game_rooms
      add constraint game_rooms_code_format_chk
      check (code ~ '^[A-Z0-9]{4}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_rooms_mode_chk') then
    alter table public.game_rooms
      add constraint game_rooms_mode_chk
      check (mode in ('1v1', 'coop'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_rooms_status_chk') then
    alter table public.game_rooms
      add constraint game_rooms_status_chk
      check (status in ('waiting', 'playing', 'finished'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_rooms_seed_range_chk') then
    alter table public.game_rooms
      add constraint game_rooms_seed_range_chk
      check (seed between 1 and 999999);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_rooms_scores_range_chk') then
    alter table public.game_rooms
      add constraint game_rooms_scores_range_chk
      check (
        host_score between 0 and 9999 and
        guest_score between 0 and 9999 and
        host_layer between 0 and 30 and
        guest_layer between 0 and 30
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_rooms_name_len_chk') then
    alter table public.game_rooms
      add constraint game_rooms_name_len_chk
      check (
        length(host_name) between 2 and 16 and
        (guest_name is null or length(guest_name) between 2 and 16)
      );
  end if;
end $$;

create index if not exists idx_game_rooms_status_created_at
  on public.game_rooms (status, created_at desc);

create index if not exists idx_game_rooms_code_status
  on public.game_rooms (code, status);

-- 2) scores: partition-ready uniqueness + ranking indexes
--    We move from (player_name, shape) uniqueness to (player_name, shape, is_daily).
do $$
declare
  con record;
begin
  if to_regclass('public.scores') is null then
    raise notice 'Table public.scores not found: skipping scores constraints/policies.';
    return;
  end if;

  -- Drop legacy unique constraints on (player_name, shape) only.
  for con in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'scores'
      and c.contype = 'u'
      and (
        select array_agg(a.attname::text order by x.ord)
        from unnest(c.conkey) with ordinality as x(attnum, ord)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = x.attnum
      ) = array['player_name', 'shape']
  loop
    execute format('alter table public.scores drop constraint %I', con.conname);
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'scores_name_len_chk') then
    alter table public.scores
      add constraint scores_name_len_chk
      check (length(player_name) between 2 and 16);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'scores_shape_chk') then
    alter table public.scores
      add constraint scores_shape_chk
      check (shape in ('triangle', 'circle', 'hexagon', 'spectre'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'scores_value_range_chk') then
    alter table public.scores
      add constraint scores_value_range_chk
      check (
        score between 0 and 9999 and
        kills between 0 and 500 and
        layers between 0 and 30
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'scores_daily_date_chk') then
    alter table public.scores
      add constraint scores_daily_date_chk
      check ((is_daily and daily_date is not null) or (not is_daily and daily_date is null));
  end if;
end $$;

create unique index if not exists uq_scores_partition
  on public.scores (player_name, shape, is_daily);

create index if not exists idx_scores_global_rank
  on public.scores (score desc, created_at desc)
  where is_daily = false;

create index if not exists idx_scores_daily_rank
  on public.scores (daily_date, score desc, created_at desc)
  where is_daily = true;

-- 3) RLS hardening (compatible mode: no auth in app yet)
alter table if exists public.game_rooms enable row level security;
alter table if exists public.scores enable row level security;

-- Drop broad/insecure policies if they exist
-- (safe to run multiple times)
drop policy if exists public_access on public.game_rooms;
drop policy if exists scores_public_access on public.scores;

-- game_rooms policies: still anonymous-compatible, but bounded by state checks
create policy game_rooms_select_all
  on public.game_rooms
  for select
  using (true);

create policy game_rooms_insert_waiting
  on public.game_rooms
  for insert
  with check (
    status = 'waiting'
    and guest_name is null
    and mode in ('1v1', 'coop')
    and seed between 1 and 999999
    and length(host_name) between 2 and 16
  );

create policy game_rooms_update_bounded
  on public.game_rooms
  for update
  using (true)
  with check (
    status in ('waiting', 'playing', 'finished')
    and mode in ('1v1', 'coop')
    and host_score between 0 and 9999
    and guest_score between 0 and 9999
    and host_layer between 0 and 30
    and guest_layer between 0 and 30
    and length(host_name) between 2 and 16
    and (guest_name is null or length(guest_name) between 2 and 16)
  );

create policy game_rooms_delete_finished_or_waiting
  on public.game_rooms
  for delete
  using (status in ('waiting', 'finished'));

-- scores policies: anonymous-compatible with strict value checks
create policy scores_select_all
  on public.scores
  for select
  using (true);

create policy scores_insert_bounded
  on public.scores
  for insert
  with check (
    length(player_name) between 2 and 16
    and shape in ('triangle', 'circle', 'hexagon', 'spectre')
    and score between 0 and 9999
    and kills between 0 and 500
    and layers between 0 and 30
    and ((is_daily and daily_date is not null) or (not is_daily and daily_date is null))
  );

create policy scores_update_bounded
  on public.scores
  for update
  using (true)
  with check (
    length(player_name) between 2 and 16
    and shape in ('triangle', 'circle', 'hexagon', 'spectre')
    and score between 0 and 9999
    and kills between 0 and 500
    and layers between 0 and 30
    and ((is_daily and daily_date is not null) or (not is_daily and daily_date is null))
  );
