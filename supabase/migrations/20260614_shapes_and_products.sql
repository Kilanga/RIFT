-- RIFT — Add shadow/paladin shapes + new purchasable products
-- 2026-06-14
--
-- Fixes:
--   1. scores_shape_chk was missing 'shadow' and 'paladin' (purchasable classes)
--      → scores submitted by these players were rejected at the DB level.
--   2. RLS policies on scores used the same outdated shape list.
--   3. device_purchases_product_chk was missing forest/lava/storm/neon themes
--      and rift-class-shadow / rift-class-paladin products
--      → purchases for those products were rejected at insert time.

-- ─── 1. scores table — shape + name length constraints ───────────────────────

do $$
begin
  if to_regclass('public.scores') is null then
    raise notice 'Table public.scores not found: skipping.';
    return;
  end if;

  -- Drop the outdated shape check and recreate with all 6 shapes
  if exists (select 1 from pg_constraint where conname = 'scores_shape_chk') then
    alter table public.scores drop constraint scores_shape_chk;
  end if;

  alter table public.scores
    add constraint scores_shape_chk
    check (shape in ('triangle', 'circle', 'hexagon', 'spectre', 'shadow', 'paladin'));

  -- The old name length check was 2-16 but the client allows up to 22 chars
  -- (setPlayerName truncates at 22, submitScore also uses slice(0, 22)).
  -- Align the DB constraint with the client.
  if exists (select 1 from pg_constraint where conname = 'scores_name_len_chk') then
    alter table public.scores drop constraint scores_name_len_chk;
  end if;

  alter table public.scores
    add constraint scores_name_len_chk
    check (length(player_name) between 2 and 22);
end $$;

-- ─── 2. scores RLS policies — include shadow and paladin ─────────────────────

drop policy if exists scores_insert_bounded   on public.scores;
drop policy if exists scores_update_bounded   on public.scores;

create policy scores_insert_bounded
  on public.scores
  for insert
  with check (
    length(player_name) between 2 and 22
    and shape in ('triangle', 'circle', 'hexagon', 'spectre', 'shadow', 'paladin')
    and score  between 0 and 9999
    and kills  between 0 and 500
    and layers between 0 and 30
    and ((is_daily and daily_date is not null) or (not is_daily and daily_date is null))
  );

create policy scores_update_bounded
  on public.scores
  for update
  using (true)
  with check (
    length(player_name) between 2 and 22
    and shape in ('triangle', 'circle', 'hexagon', 'spectre', 'shadow', 'paladin')
    and score  between 0 and 9999
    and kills  between 0 and 500
    and layers between 0 and 30
    and ((is_daily and daily_date is not null) or (not is_daily and daily_date is null))
  );

-- Also update the unique index to cover all shapes (it's on player_name+shape+is_daily,
-- no shape filter needed — but refreshing the covering index is safe)
drop index if exists uq_scores_partition;
create unique index uq_scores_partition
  on public.scores (player_name, shape, is_daily);

-- ─── 3. device_purchases — product allowlist ──────────────────────────────────

do $$
begin
  if to_regclass('public.device_purchases') is null then
    raise notice 'Table public.device_purchases not found: skipping.';
    return;
  end if;

  -- Drop outdated constraint (only had blood/ice/void themes, no classes)
  if exists (select 1 from pg_constraint where conname = 'device_purchases_product_chk') then
    alter table public.device_purchases drop constraint device_purchases_product_chk;
  end if;

  alter table public.device_purchases
    add constraint device_purchases_product_chk
    check (product_id in (
      -- Pack premium (contient Spectre)
      'rift-premium',
      -- Thèmes de grille (achat individuel)
      'rift-theme-blood',
      'rift-theme-ice',
      'rift-theme-void',
      'rift-theme-forest',
      'rift-theme-lava',
      'rift-theme-storm',
      'rift-theme-neon',
      -- Classes individuelles
      'rift-class-shadow',
      'rift-class-paladin'
    ));
end $$;
