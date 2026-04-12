-- RIFT — Analytics events (client-side telemetry)
-- Minimal event store for balancing and product analytics.

create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id         text        primary key,
  event_name text        not null,
  payload    jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created_at
  on public.analytics_events (created_at desc);

create index if not exists idx_analytics_events_event_name
  on public.analytics_events (event_name);

create index if not exists idx_analytics_events_payload_runid
  on public.analytics_events ((payload->>'runId'));

alter table public.analytics_events enable row level security;

-- Open insert/select for anon to keep client instrumentation simple.
-- If needed later, replace with RPC/Edge Function ingestion.
create policy analytics_events_insert_anon
  on public.analytics_events
  for insert
  with check (true);

create policy analytics_events_select_anon
  on public.analytics_events
  for select
  using (true);

-- Weekly balancing summary view
create or replace view public.analytics_weekly_run_summary as
select
  date_trunc('week', created_at) as week_start,
  payload->>'shape' as shape,
  count(*) filter (where event_name = 'run_start') as runs_started,
  count(*) filter (where event_name = 'run_end' and payload->>'result' = 'victory') as runs_won,
  count(*) filter (where event_name = 'run_end' and payload->>'result' = 'death') as runs_lost,
  count(*) filter (where event_name = 'run_end' and payload->>'result' = 'abandon') as runs_abandoned,
  avg((payload->>'score')::numeric) filter (where event_name = 'run_end') as avg_run_score,
  avg((payload->>'roomsCleared')::numeric) filter (where event_name = 'run_end') as avg_rooms_cleared
from public.analytics_events
where event_name in ('run_start', 'run_end')
group by 1, 2;
