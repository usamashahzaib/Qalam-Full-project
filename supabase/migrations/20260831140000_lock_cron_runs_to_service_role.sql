alter table public.cron_runs enable row level security;

drop policy if exists "cron_runs_service_only" on public.cron_runs;

revoke all on table public.cron_runs from anon, authenticated;
