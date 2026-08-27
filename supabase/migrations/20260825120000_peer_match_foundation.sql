-- Peer match foundation.
--
-- Adds an opt-in, double-opt-in matching layer on top of existing career data.
-- Deliberately domain-scoped from day one: the scoring engine in lib/matching.ts
-- is attribute-driven, so a second match domain only needs new attribute columns
-- and new scoring rules, not a schema rewrite.
--
-- Consent is recorded in career_consents under the 'peer_matching' purpose, which
-- the existing GDPR deletion path already sweeps.

alter table public.career_consents drop constraint if exists career_consents_purpose_check;
alter table public.career_consents add constraint career_consents_purpose_check
  check (purpose in ('recruiter_discovery', 'outcome_learning', 'partner_reporting', 'peer_matching'));

create table if not exists public.match_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  domain text not null default 'professional' check (domain in ('professional')),
  opted_in boolean not null default false,
  display_name text not null default '',
  headline text not null default '',
  industry text not null default '',
  seniority text not null default '',
  location text not null default '',
  expertise text[] not null default '{}',
  audience text[] not null default '{}',
  goals text[] not null default '{}',
  contact_email text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists match_profiles_pool_idx
  on public.match_profiles (domain, updated_at desc)
  where opted_in = true;

create index if not exists match_profiles_user_idx on public.match_profiles (user_id);

alter table public.match_profiles enable row level security;
revoke all on public.match_profiles from anon, authenticated;
grant select, insert, update, delete on public.match_profiles to service_role;

create table if not exists public.match_suggestions (
  id uuid primary key default gen_random_uuid(),
  domain text not null default 'professional',
  period_start date not null,
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  candidate_user_id uuid not null references public.users(id) on delete cascade,
  candidate_workspace_id uuid not null references public.workspaces(id) on delete cascade,
  score integer not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'interested', 'passed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (user_id, candidate_user_id, period_start),
  constraint match_suggestions_no_self check (user_id <> candidate_user_id)
);

create index if not exists match_suggestions_period_idx
  on public.match_suggestions (user_id, period_start desc);

create index if not exists match_suggestions_reciprocal_idx
  on public.match_suggestions (candidate_user_id, user_id, status);

alter table public.match_suggestions enable row level security;
revoke all on public.match_suggestions from anon, authenticated;
grant select, insert, update, delete on public.match_suggestions to service_role;

-- Pair rows are stored with user_a < user_b so a mutual match can never be
-- written twice under two orderings.
create table if not exists public.match_connections (
  id uuid primary key default gen_random_uuid(),
  domain text not null default 'professional',
  user_a uuid not null references public.users(id) on delete cascade,
  user_b uuid not null references public.users(id) on delete cascade,
  connected_at timestamptz not null default now(),
  unique (domain, user_a, user_b),
  constraint match_connections_ordered check (user_a < user_b)
);

create index if not exists match_connections_user_b_idx on public.match_connections (user_b);

alter table public.match_connections enable row level security;
revoke all on public.match_connections from anon, authenticated;
grant select, insert, update, delete on public.match_connections to service_role;
