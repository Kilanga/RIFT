-- RIFT - Balancing dashboard views (Act I focus)
-- Derived views on top of analytics_events for quick balancing checks.

create index if not exists idx_analytics_events_room_enter_boss
  on public.analytics_events ((payload->>'bossType'))
  where event_name = 'room_enter';

create index if not exists idx_analytics_events_run_end_result
  on public.analytics_events ((payload->>'result'))
  where event_name = 'run_end';

create or replace view public.analytics_run_end_fact as
select
  created_at,
  payload->>'runId' as run_id,
  payload->>'result' as result,
  payload->>'shape' as shape,
  payload->>'bossType' as boss_type,
  payload->>'killedBy' as killed_by,
  coalesce(nullif(payload->>'score', '')::numeric, 0) as score,
  coalesce(nullif(payload->>'roomsCleared', '')::int, 0) as rooms_cleared,
  coalesce(nullif(payload->>'layers', '')::int, 0) as layers,
  coalesce(nullif(payload->>'permanentCount', '')::int, 0) as permanent_count,
  coalesce(nullif(payload->>'unlockablePermanentCount', '')::int, 0) as unlockable_permanent_count
from public.analytics_events
where event_name = 'run_end'
  and payload ? 'runId';

create or replace view public.analytics_act1_boss_enter_fact as
select
  created_at,
  payload->>'runId' as run_id,
  payload->>'roomId' as room_id,
  payload->>'bossType' as boss_type,
  coalesce(nullif(payload->>'layer', '')::int, 0) as layer,
  coalesce(nullif(payload->>'permanentCount', '')::int, 0) as permanent_count,
  coalesce(nullif(payload->>'unlockablePermanentCount', '')::int, 0) as unlockable_permanent_count,
  coalesce(nullif(payload->>'rustPressure', '')::numeric, 0) as rust_pressure
from public.analytics_events
where event_name = 'room_enter'
  and payload->>'isBossRoom' = 'true'
  and payload ? 'runId'
  and payload ? 'bossType';

create or replace view public.analytics_act1_boss_outcomes as
with first_act1_boss as (
  select distinct on (run_id)
    run_id,
    boss_type,
    permanent_count,
    unlockable_permanent_count,
    rust_pressure,
    created_at
  from public.analytics_act1_boss_enter_fact
  where layer between 1 and 4
  order by run_id, created_at asc
),
run_end as (
  select
    run_id,
    result,
    score,
    rooms_cleared,
    layers,
    shape,
    killed_by
  from public.analytics_run_end_fact
)
select
  b.run_id,
  b.boss_type,
  b.permanent_count,
  b.unlockable_permanent_count,
  b.rust_pressure,
  r.result,
  r.score,
  r.rooms_cleared,
  r.layers,
  r.shape,
  r.killed_by,
  (r.result = 'victory') as run_won,
  (r.result = 'death') as run_lost
from first_act1_boss b
left join run_end r
  on r.run_id = b.run_id;

create or replace view public.analytics_act1_boss_balance_dashboard as
select
  boss_type,
  case
    when permanent_count < 8 then '0-7'
    when permanent_count < 12 then '8-11'
    when permanent_count < 16 then '12-15'
    else '16+'
  end as permanent_bucket,
  count(*) as runs,
  avg(case when run_won then 1 else 0 end)::numeric(6,4) as win_rate,
  avg(case when run_lost then 1 else 0 end)::numeric(6,4) as death_rate,
  avg(score)::numeric(10,2) as avg_score,
  avg(rooms_cleared)::numeric(10,2) as avg_rooms_cleared,
  avg(unlockable_permanent_count)::numeric(10,2) as avg_unlockable_permanents,
  avg(rust_pressure)::numeric(10,4) as avg_rust_pressure
from public.analytics_act1_boss_outcomes
group by 1, 2
order by boss_type, permanent_bucket;
