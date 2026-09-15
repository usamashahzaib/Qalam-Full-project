-- Agency operating system: client handoff links, LinkedIn token guardian,
-- silence-as-consent approvals with red-pen comments, Voice Passport,
-- Voice Drop prompts, Proof reports, Pitch previews, and idempotent job claims.
-- Every new table is service-role only. The API layer is the only reader and
-- every public page is gated by a hashed, expiring, single-purpose token.

-- ----------------------------------------------------------------
-- Client workspace operating settings
-- ----------------------------------------------------------------
alter table public.workspaces
  add column if not exists cadence_posts_per_week integer not null default 3,
  add column if not exists auto_approve_hours integer,
  add column if not exists voice_drop_enabled boolean not null default false,
  add column if not exists voice_passport_summary text;

alter table public.workspaces drop constraint if exists workspaces_cadence_posts_per_week_check;
alter table public.workspaces add constraint workspaces_cadence_posts_per_week_check
  check (cadence_posts_per_week between 1 and 14);

alter table public.workspaces drop constraint if exists workspaces_auto_approve_hours_check;
alter table public.workspaces add constraint workspaces_auto_approve_hours_check
  check (auto_approve_hours is null or auto_approve_hours between 24 and 144);

alter table public.workspaces drop constraint if exists workspaces_voice_passport_summary_check;
alter table public.workspaces add constraint workspaces_voice_passport_summary_check
  check (voice_passport_summary is null or char_length(voice_passport_summary) <= 2000);

-- ----------------------------------------------------------------
-- Approvals: silence-as-consent and red-pen comments
-- ----------------------------------------------------------------
alter table public.approvals
  add column if not exists auto_approve_at timestamptz,
  add column if not exists heads_up_sent_at timestamptz,
  add column if not exists auto_approved boolean not null default false,
  add column if not exists decided_at timestamptz,
  add column if not exists reminder_token_hash text,
  add column if not exists inline_comments jsonb not null default '[]'::jsonb;

alter table public.approvals drop constraint if exists approvals_inline_comments_array_check;
alter table public.approvals add constraint approvals_inline_comments_array_check
  check (jsonb_typeof(inline_comments) = 'array');

create index if not exists approvals_auto_approve_due_idx
  on public.approvals (auto_approve_at)
  where status = 'pending' and auto_approve_at is not null;

create index if not exists approvals_workspace_status_idx
  on public.approvals (workspace_id, status, created_at desc);

-- ----------------------------------------------------------------
-- LinkedIn token guardian bookkeeping
-- ----------------------------------------------------------------
alter table public.publishing_accounts
  add column if not exists expiry_warning_sent_at timestamptz;

-- ----------------------------------------------------------------
-- Handoff links: a client connects their own LinkedIn without an account
-- ----------------------------------------------------------------
create table if not exists public.workspace_handoff_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  recipient_name text check (recipient_name is null or char_length(recipient_name) <= 100),
  recipient_email text check (recipient_email is null or char_length(recipient_email) <= 254),
  created_by uuid references public.users(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'guardian')),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_handoff_links_workspace_idx
  on public.workspace_handoff_links (workspace_id, created_at desc);

-- ----------------------------------------------------------------
-- Voice Passport: deliberate, team-saved rules per client
-- ----------------------------------------------------------------
create table if not exists public.voice_passport_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('do', 'dont', 'banned_phrase', 'correction')),
  body text not null check (char_length(body) between 2 and 600),
  note text check (note is null or char_length(note) <= 600),
  source_approval_id uuid references public.approvals(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists voice_passport_entries_workspace_idx
  on public.voice_passport_entries (workspace_id, created_at desc);

-- ----------------------------------------------------------------
-- Voice Drop: one question to the client, answered by text or voice note
-- ----------------------------------------------------------------
create table if not exists public.client_voice_drops (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  question text not null check (char_length(question) between 5 and 300),
  token_hash text not null unique,
  recipient_email text not null check (char_length(recipient_email) <= 254),
  created_by uuid references public.users(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'weekly')),
  expires_at timestamptz not null,
  answer text check (answer is null or char_length(answer) <= 8000),
  answer_kind text check (answer_kind is null or answer_kind in ('text', 'voice')),
  answered_at timestamptz,
  used_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists client_voice_drops_workspace_idx
  on public.client_voice_drops (workspace_id, created_at desc);

-- ----------------------------------------------------------------
-- Proof reports: frozen snapshot of real results, shared by link
-- ----------------------------------------------------------------
create table if not exists public.client_proof_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references public.users(id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  snapshot jsonb not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_end > period_start)
);

create index if not exists client_proof_reports_workspace_idx
  on public.client_proof_reports (workspace_id, created_at desc);

-- ----------------------------------------------------------------
-- Pitch previews: sample drafts for a prospect. Source posts are not stored.
-- ----------------------------------------------------------------
create table if not exists public.pitch_previews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  agency_name text not null check (char_length(agency_name) between 2 and 100),
  prospect_name text not null check (char_length(prospect_name) between 2 and 100),
  prospect_role text check (prospect_role is null or char_length(prospect_role) <= 160),
  samples jsonb not null check (jsonb_typeof(samples) = 'array'),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pitch_previews_owner_idx
  on public.pitch_previews (owner_id, created_at desc);

-- ----------------------------------------------------------------
-- Idempotent job claims for daily and weekly agency jobs
-- ----------------------------------------------------------------
create table if not exists public.agency_job_claims (
  job_key text primary key check (char_length(job_key) <= 200),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Atomic counters for public views
-- ----------------------------------------------------------------
create or replace function public.record_public_view(p_table text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_table = 'client_proof_reports' then
    update public.client_proof_reports
      set view_count = view_count + 1, last_viewed_at = now()
      where id = p_id;
  elsif p_table = 'pitch_previews' then
    update public.pitch_previews
      set view_count = view_count + 1, last_viewed_at = now()
      where id = p_id;
  else
    raise exception 'record_public_view_table_not_allowed';
  end if;
end;
$$;

revoke all on function public.record_public_view(text, uuid) from public, anon, authenticated;
grant execute on function public.record_public_view(text, uuid) to service_role;

-- ----------------------------------------------------------------
-- Notification types for agency events
-- ----------------------------------------------------------------
alter table public.app_notifications drop constraint if exists app_notifications_type_check;
alter table public.app_notifications add constraint app_notifications_type_check
  check (type in (
    'post_published', 'post_failed', 'post_reminder', 'career_addon_paid', 'career_momentum_reminder',
    'agency_alert', 'approval_decided', 'voice_drop_answered', 'linkedin_connected'
  ));

-- ----------------------------------------------------------------
-- Service-role only access
-- ----------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'workspace_handoff_links',
    'voice_passport_entries',
    'client_voice_drops',
    'client_proof_reports',
    'pitch_previews',
    'agency_job_claims'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('drop policy if exists %I on public.%I', t || '_service_only', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service_only', t);
  end loop;
end;
$$;
