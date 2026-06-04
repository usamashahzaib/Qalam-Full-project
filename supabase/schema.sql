-- Drop old fake tables
drop table if exists public.workspace_snapshots cascade;
drop table if exists public.workspace_events cascade;
drop table if exists public.workspace_jobs cascade;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
create table public.users (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    full_name text,
    image_url text,
    session_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Organizations (Agencies)
create table public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    billing_plan text default 'Free',
    plan text not null default 'Free',
    subscription_status text not null default 'active',
    plan_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- Workspaces (Clients / Brands)
create table public.workspaces (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade not null,
    name text not null,
    industry text,
    linkedin_url text,
    notes text,
    tone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Memberships (Users in Organizations/Workspaces)
create table public.memberships (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade not null,
    organization_id uuid references public.organizations(id) on delete cascade,
    workspace_id uuid references public.workspaces(id) on delete cascade, -- if null, org-level
    role text not null check (role in ('super_admin', 'agency_admin', 'editor', 'client_reviewer', 'viewer')),
    created_at timestamptz not null default now(),
    unique(user_id, organization_id, workspace_id)
);

-- Publishing Accounts
create table public.publishing_accounts (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    provider text not null default 'linkedin',
    provider_account_id text not null,
    access_token text,
    refresh_token text,
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Posts
create table public.posts (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    author_id uuid references public.users(id) on delete set null,
    title text not null,
    content text,
    type text not null,
    status text not null check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published', 'failed')),
    scheduled_time timestamptz,
    published_at timestamptz,
    external_post_urn text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Post Variants
create table public.post_variants (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade not null,
    content text not null,
    tone text,
    created_at timestamptz not null default now()
);

-- Carousel Projects
create table public.carousel_projects (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade,
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    theme text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Carousel Slides
create table public.carousel_slides (
    id uuid primary key default uuid_generate_v4(),
    carousel_id uuid references public.carousel_projects(id) on delete cascade not null,
    order_index integer not null,
    title text,
    content text,
    image_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Approvals
create table public.approvals (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade not null,
    reviewer_id uuid references public.users(id) on delete set null,
    status text not null check (status in ('pending', 'approved', 'rejected')),
    comments text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Publish Logs
create table public.publish_logs (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade not null,
    account_id uuid references public.publishing_accounts(id) on delete set null,
    status text not null check (status in ('success', 'failed')),
    error_message text,
    provider_response jsonb,
    created_at timestamptz not null default now()
);

-- Conversations
create table public.conversations (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    user_id uuid references public.users(id) on delete cascade not null,
    title text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Messages
create table public.messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    created_at timestamptz not null default now()
);

-- Jobs
create table public.jobs (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    type text not null,
    status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
    payload jsonb,
    result jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Analytics Events
create table public.analytics_events (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid references public.workspaces(id) on delete cascade not null,
    post_id uuid references public.posts(id) on delete cascade,
    event_type text not null,
    metrics jsonb,
    recorded_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    title text not null,
    content text,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

-- LinkedIn Credentials (server-side token store)
create table public.linkedin_credentials (
    id uuid primary key default uuid_generate_v4(),
    owner_email text unique not null,
    access_token text not null,
    member_id text,
    token_expires_at bigint,
    updated_at timestamptz not null default now()
);

-- Voice Profiles (per-workspace brand tone)
create table public.voice_profiles (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid references public.workspaces(id) on delete cascade not null unique,
    name text,
    title text,
    industry text,
    tone text,
    goals text[],
    sample_posts text[],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.publishing_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.post_variants enable row level security;
alter table public.carousel_projects enable row level security;
alter table public.carousel_slides enable row level security;
alter table public.approvals enable row level security;
alter table public.publish_logs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.jobs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.notifications enable row level security;
alter table public.linkedin_credentials enable row level security;
alter table public.voice_profiles enable row level security;
alter table public.users enable row level security;

-- =============================================================
-- RLS POLICIES
-- The service_role key (used server-side) bypasses RLS by default.
-- These policies govern direct Supabase client (anon/authenticated) access.
-- =============================================================

-- users: each user can only read/update their own row
create policy "users_own" on public.users
  for all using (auth.uid()::text = id::text);

-- organizations: members can read their orgs
create policy "org_members_select" on public.organizations
  for select using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organizations.id
        and m.user_id::text = auth.uid()::text
    )
  );

-- workspaces: members can read their workspaces
create policy "workspace_members_select" on public.workspaces
  for select using (
    exists (
      select 1 from public.memberships m
      where m.workspace_id = workspaces.id
        and m.user_id::text = auth.uid()::text
    )
  );

-- memberships: users can see their own memberships
create policy "memberships_own" on public.memberships
  for select using (user_id::text = auth.uid()::text);

-- posts: workspace members can read posts
create policy "posts_workspace_members" on public.posts
  for select using (
    exists (
      select 1 from public.memberships m
      where m.workspace_id = posts.workspace_id
        and m.user_id::text = auth.uid()::text
    )
  );

-- linkedin_credentials: users can only see their own
create policy "linkedin_creds_own" on public.linkedin_credentials
  for all using (owner_email = current_setting('request.jwt.claims', true)::jsonb->>'email');

-- voice_profiles: workspace members can read
create policy "voice_profile_members" on public.voice_profiles
  for select using (
    exists (
      select 1 from public.memberships m
      where m.workspace_id = voice_profiles.workspace_id
        and m.user_id::text = auth.uid()::text
    )
  );

-- notifications: users see their own
create policy "notifications_own" on public.notifications
  for select using (user_id::text = auth.uid()::text);
