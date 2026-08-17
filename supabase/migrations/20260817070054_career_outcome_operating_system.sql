create table if not exists public.career_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('achievement', 'skill', 'credential', 'work_sample', 'experience', 'education')),
  title text not null check (char_length(title) between 1 and 180),
  summary text not null default '',
  source_url text,
  issuer text,
  occurred_on date,
  skills text[] not null default '{}',
  metrics jsonb not null default '{}',
  verification_status text not null default 'self_reported' check (verification_status in ('self_reported', 'documented', 'partner_verified')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  company text not null check (char_length(company) between 1 and 180),
  location text not null default '',
  employment_type text not null default '',
  source_url text,
  source_name text not null default '',
  description text not null default '',
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.career_jobs(id) on delete cascade,
  resume_id uuid references public.resume_documents(id) on delete set null,
  resume_version_id uuid references public.resume_versions(id) on delete set null,
  status text not null default 'saved' check (status in ('saved', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn', 'archived')),
  excitement smallint check (excitement between 1 and 5),
  applied_at timestamptz,
  next_action text not null default '',
  next_action_at timestamptz,
  notes text not null default '',
  rejection_reason text,
  offer_amount numeric,
  offer_currency text,
  source_attribution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, job_id)
);

create table if not exists public.career_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.career_applications(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'status_changed', 'resume_attached', 'note_added', 'interview_scheduled', 'offer_received', 'feedback_received')),
  from_status text,
  to_status text,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create table if not exists public.career_consents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  purpose text not null check (purpose in ('recruiter_discovery', 'outcome_learning', 'partner_reporting')),
  granted boolean not null default false,
  policy_version text not null default '2026-08-17',
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, purpose)
);

create table if not exists public.career_organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 180),
  organization_type text not null check (organization_type in ('employer', 'recruiter', 'university', 'bootcamp', 'credential_body')),
  website text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.career_organization_members (
  organization_id uuid not null references public.career_organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'recruiter', 'coach', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.career_shortlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.career_organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  job_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_shortlist_members (
  shortlist_id uuid not null references public.career_shortlists(id) on delete cascade,
  candidate_workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage text not null default 'saved' check (stage in ('saved', 'contacted', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  notes text not null default '',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shortlist_id, candidate_workspace_id)
);

create table if not exists public.career_recruiter_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.career_organizations(id) on delete cascade,
  recruiter_user_id uuid not null references public.users(id) on delete cascade,
  candidate_workspace_id uuid not null references public.workspaces(id) on delete cascade,
  application_id uuid references public.career_applications(id) on delete set null,
  verdict text not null check (verdict in ('strong_match', 'possible_match', 'not_now')),
  strengths text[] not null default '{}',
  gaps text[] not null default '{}',
  note text not null default '',
  share_with_candidate boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists career_evidence_workspace_idx on public.career_evidence (workspace_id, updated_at desc);
create index if not exists career_evidence_skills_idx on public.career_evidence using gin (skills);
create index if not exists career_jobs_workspace_idx on public.career_jobs (workspace_id, updated_at desc);
create index if not exists career_applications_workspace_status_idx on public.career_applications (workspace_id, status, updated_at desc);
create index if not exists career_application_events_application_idx on public.career_application_events (application_id, occurred_at desc);
create index if not exists career_consents_workspace_idx on public.career_consents (workspace_id, purpose);
create index if not exists career_organizations_verification_idx on public.career_organizations (verification_status, organization_type);
create index if not exists career_recruiter_feedback_candidate_idx on public.career_recruiter_feedback (candidate_workspace_id, created_at desc);

alter table public.career_evidence enable row level security;
alter table public.career_jobs enable row level security;
alter table public.career_applications enable row level security;
alter table public.career_application_events enable row level security;
alter table public.career_consents enable row level security;
alter table public.career_organizations enable row level security;
alter table public.career_organization_members enable row level security;
alter table public.career_shortlists enable row level security;
alter table public.career_shortlist_members enable row level security;
alter table public.career_recruiter_feedback enable row level security;

revoke all on public.career_evidence from anon, authenticated;
revoke all on public.career_jobs from anon, authenticated;
revoke all on public.career_applications from anon, authenticated;
revoke all on public.career_application_events from anon, authenticated;
revoke all on public.career_consents from anon, authenticated;
revoke all on public.career_organizations from anon, authenticated;
revoke all on public.career_organization_members from anon, authenticated;
revoke all on public.career_shortlists from anon, authenticated;
revoke all on public.career_shortlist_members from anon, authenticated;
revoke all on public.career_recruiter_feedback from anon, authenticated;

grant select, insert, update, delete on public.career_evidence to service_role;
grant select, insert, update, delete on public.career_jobs to service_role;
grant select, insert, update, delete on public.career_applications to service_role;
grant select, insert, update, delete on public.career_application_events to service_role;
grant select, insert, update, delete on public.career_consents to service_role;
grant select, insert, update, delete on public.career_organizations to service_role;
grant select, insert, update, delete on public.career_organization_members to service_role;
grant select, insert, update, delete on public.career_shortlists to service_role;
grant select, insert, update, delete on public.career_shortlist_members to service_role;
grant select, insert, update, delete on public.career_recruiter_feedback to service_role;
