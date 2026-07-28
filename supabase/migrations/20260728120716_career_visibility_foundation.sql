create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  target_role text not null default '',
  target_industry text not null default '',
  location text not null default '',
  years_experience integer check (years_experience between 0 and 60),
  summary text not null default '',
  skills text[] not null default '{}',
  achievements jsonb not null default '[]'::jsonb,
  experiences jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  career_goals text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.linkedin_audits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  overall_score integer not null check (overall_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.resume_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  resume_text text not null,
  job_description text not null default '',
  result jsonb not null default '{}'::jsonb,
  overall_score integer not null check (overall_score between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists linkedin_audits_workspace_created_idx
  on public.linkedin_audits (workspace_id, created_at desc);

create index if not exists resume_reviews_workspace_created_idx
  on public.resume_reviews (workspace_id, created_at desc);

alter table public.career_profiles enable row level security;
alter table public.linkedin_audits enable row level security;
alter table public.resume_reviews enable row level security;

revoke all on public.career_profiles from anon, authenticated;
revoke all on public.linkedin_audits from anon, authenticated;
revoke all on public.resume_reviews from anon, authenticated;

grant select, insert, update, delete on public.career_profiles to service_role;
grant select, insert, update, delete on public.linkedin_audits to service_role;
grant select, insert, update, delete on public.resume_reviews to service_role;

create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  template_key text not null default 'clean',
  target_role text not null default '',
  target_company text not null default '',
  job_description text not null default '',
  resume_data jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  ats_score integer check (ats_score between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resume_documents(id) on delete cascade,
  version_number integer not null,
  resume_data jsonb not null,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (resume_id, version_number)
);

create table if not exists public.career_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  linkedin_audits_used integer not null default 0,
  resume_reviews_used integer not null default 0,
  resume_generations_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table if not exists public.career_addon_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  addon_key text not null,
  amount_pkr integer not null check (amount_pkr > 0),
  quantity integer not null default 1 check (quantity between 1 and 20),
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  payment_provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_content_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'csv', 'linkedin_api')),
  source_url text,
  content text not null,
  metrics jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  ownership_confirmed boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.candidate_visibility (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_searchable boolean not null default false,
  public_name text not null default '',
  professional_headline text not null default '',
  target_roles text[] not null default '{}',
  locations text[] not null default '{}',
  skills text[] not null default '{}',
  years_experience integer check (years_experience between 0 and 60),
  linkedin_url text,
  contact_email text,
  updated_at timestamptz not null default now()
);

create table if not exists public.career_cohorts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  code text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_cohort_members (
  cohort_id uuid not null references public.career_cohorts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'learner' check (role in ('instructor', 'learner')),
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create index if not exists resume_documents_workspace_updated_idx
  on public.resume_documents (workspace_id, updated_at desc);
create index if not exists career_content_imports_workspace_created_idx
  on public.career_content_imports (workspace_id, created_at desc);
create index if not exists candidate_visibility_search_idx
  on public.candidate_visibility (is_searchable, updated_at desc);
create index if not exists career_cohort_members_user_idx
  on public.career_cohort_members (user_id);

alter table public.resume_documents enable row level security;
alter table public.resume_versions enable row level security;
alter table public.career_usage enable row level security;
alter table public.career_addon_orders enable row level security;
alter table public.career_content_imports enable row level security;
alter table public.candidate_visibility enable row level security;
alter table public.career_cohorts enable row level security;
alter table public.career_cohort_members enable row level security;

revoke all on public.resume_documents from anon, authenticated;
revoke all on public.resume_versions from anon, authenticated;
revoke all on public.career_usage from anon, authenticated;
revoke all on public.career_addon_orders from anon, authenticated;
revoke all on public.career_content_imports from anon, authenticated;
revoke all on public.candidate_visibility from anon, authenticated;
revoke all on public.career_cohorts from anon, authenticated;
revoke all on public.career_cohort_members from anon, authenticated;

grant select, insert, update, delete on public.resume_documents to service_role;
grant select, insert, update, delete on public.resume_versions to service_role;
grant select, insert, update, delete on public.career_usage to service_role;
grant select, insert, update, delete on public.career_addon_orders to service_role;
grant select, insert, update, delete on public.career_content_imports to service_role;
grant select, insert, update, delete on public.candidate_visibility to service_role;
grant select, insert, update, delete on public.career_cohorts to service_role;
grant select, insert, update, delete on public.career_cohort_members to service_role;

create or replace function public.consume_career_usage(
  p_user_id uuid,
  p_feature text,
  p_limit integer
) returns table (allowed boolean, used integer, feature_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_used integer;
  v_allowed boolean := true;
begin
  if p_feature not in ('linkedin_audit', 'resume_review', 'resume_generation') then
    raise exception 'invalid career feature';
  end if;

  insert into public.career_usage (user_id, period_start)
  values (p_user_id, v_period)
  on conflict (user_id, period_start) do nothing;

  if p_feature = 'linkedin_audit' then
    update public.career_usage
    set linkedin_audits_used = linkedin_audits_used + 1, updated_at = now()
    where user_id = p_user_id
      and period_start = v_period
      and linkedin_audits_used < p_limit
    returning linkedin_audits_used into v_used;
  elsif p_feature = 'resume_review' then
    update public.career_usage
    set resume_reviews_used = resume_reviews_used + 1, updated_at = now()
    where user_id = p_user_id
      and period_start = v_period
      and resume_reviews_used < p_limit
    returning resume_reviews_used into v_used;
  else
    update public.career_usage
    set resume_generations_used = resume_generations_used + 1, updated_at = now()
    where user_id = p_user_id
      and period_start = v_period
      and resume_generations_used < p_limit
    returning resume_generations_used into v_used;
  end if;

  if v_used is null then
    v_allowed := false;
    select case p_feature
      when 'linkedin_audit' then linkedin_audits_used
      when 'resume_review' then resume_reviews_used
      else resume_generations_used
    end into v_used
    from public.career_usage
    where user_id = p_user_id and period_start = v_period;
  end if;

  return query select v_allowed, v_used, p_limit;
end;
$$;

revoke all on function public.consume_career_usage(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_career_usage(uuid, text, integer)
  to service_role;
