-- In-app notification center: post published/failed, scheduled-post reminders,
-- and career add-on payment confirmations. Service-role only, same pattern as
-- scheduling_notifications - the API layer (withAuth routes) is the only reader.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  type text not null check (type in ('post_published', 'post_failed', 'post_reminder', 'career_addon_paid')),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_user_created_idx
  on public.app_notifications (user_id, created_at desc);

create index if not exists app_notifications_unread_idx
  on public.app_notifications (user_id)
  where read_at is null;

alter table public.app_notifications enable row level security;

revoke all on public.app_notifications from anon, authenticated;
grant select, insert, update, delete on public.app_notifications to service_role;

drop policy if exists "app_notifications_service_only" on public.app_notifications;

create policy "app_notifications_service_only" on public.app_notifications
  for all to service_role using (true) with check (true);
