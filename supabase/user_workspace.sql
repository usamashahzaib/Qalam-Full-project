-- ByQalam workspace blob (one row per Clerk user). Run in Supabase SQL Editor.
-- Requires Clerk ↔ Supabase JWT integration so auth.jwt()->>'sub' is the Clerk user id.
-- https://supabase.com/docs/guides/auth/third-party/clerk

create table if not exists public.user_workspace (
  clerk_user_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_workspace_updated_at_idx on public.user_workspace (updated_at desc);

alter table public.user_workspace enable row level security;

drop policy if exists "workspace_select_own" on public.user_workspace;
drop policy if exists "workspace_insert_own" on public.user_workspace;
drop policy if exists "workspace_update_own" on public.user_workspace;
drop policy if exists "workspace_delete_own" on public.user_workspace;

create policy "workspace_select_own"
  on public.user_workspace for select
  using ((select auth.jwt()->>'sub') is not null and clerk_user_id = (select auth.jwt()->>'sub'));

create policy "workspace_insert_own"
  on public.user_workspace for insert
  with check ((select auth.jwt()->>'sub') is not null and clerk_user_id = (select auth.jwt()->>'sub'));

create policy "workspace_update_own"
  on public.user_workspace for update
  using ((select auth.jwt()->>'sub') is not null and clerk_user_id = (select auth.jwt()->>'sub'));

create policy "workspace_delete_own"
  on public.user_workspace for delete
  using ((select auth.jwt()->>'sub') is not null and clerk_user_id = (select auth.jwt()->>'sub'));

grant select, insert, update, delete on public.user_workspace to authenticated;
grant select, insert, update, delete on public.user_workspace to anon;
