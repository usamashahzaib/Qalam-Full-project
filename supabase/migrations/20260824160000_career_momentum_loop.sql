create table if not exists public.career_daily_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  signal_date date not null,
  prompt_key text not null check (char_length(prompt_key) between 1 and 40),
  note text not null check (char_length(note) between 3 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, signal_date)
);

create index if not exists career_daily_signals_workspace_date_idx
  on public.career_daily_signals (workspace_id, signal_date desc);

create index if not exists career_daily_signals_user_date_idx
  on public.career_daily_signals (user_id, signal_date desc);

alter table public.career_daily_signals enable row level security;

revoke all on public.career_daily_signals from anon, authenticated;
grant select, insert, update, delete on public.career_daily_signals to service_role;

create table if not exists public.career_habit_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reminder_enabled boolean not null default false,
  reminder_hour smallint not null default 17 check (reminder_hour between 0 and 23),
  timezone_offset smallint not null default 0 check (timezone_offset between -840 and 840),
  last_reminded_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists career_habit_preferences_due_idx
  on public.career_habit_preferences (reminder_enabled, reminder_hour)
  where reminder_enabled = true;

alter table public.career_habit_preferences enable row level security;

revoke all on public.career_habit_preferences from anon, authenticated;
grant select, insert, update, delete on public.career_habit_preferences to service_role;

alter table public.app_notifications
  drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check check (
    type in ('post_published', 'post_failed', 'post_reminder', 'career_addon_paid', 'career_momentum_reminder')
  );
