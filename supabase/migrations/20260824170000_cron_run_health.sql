create table if not exists public.cron_runs (
  job_name text primary key,
  last_started_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_alerted_at timestamptz,
  last_error text,
  duration_ms integer,
  updated_at timestamptz not null default now()
);

alter table public.cron_runs enable row level security;

drop policy if exists "cron_runs_service_only" on public.cron_runs;
create policy "cron_runs_service_only" on public.cron_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.cron_runs is
  'Operational heartbeat for scheduled jobs. Written by service-role cron routes and read by admin operations.';
