-- ================================================================
-- DEPRECATED — DO NOT RUN
-- 0001_relational_workspace.sql
-- ================================================================
-- This file uses an old schema (owner_email TEXT UNIQUE NOT NULL on
-- workspaces, old posts shape). It CONFLICTS with schema_final.sql
-- and all migrations from 0010 onward.
-- Superseded by: schema_final.sql
-- ================================================================
-- Original description:
-- This migration normalizes the workspace_snapshots JSON blob into highly scalable relational tables.
-- It prevents split-brain sync issues (CRDT architecture) and database row-lock bottlenecks.

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT UNIQUE NOT NULL,
  billing_plan TEXT DEFAULT 'Free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.posts (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  post_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  scheduled_time TEXT,
  publish_date TEXT,
  external_urn TEXT,
  client_id UUID, -- For Agency functionality
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  impressions INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0.0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure robust indexes for fast reads on Dashboard
CREATE INDEX idx_posts_workspace ON public.posts(workspace_id);
CREATE INDEX idx_analytics_post ON public.analytics_snapshots(post_id);

-- Row Level Security (RLS) to enforce elite security isolating tenant data
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces are isolated" ON public.workspaces
  FOR ALL USING (auth.jwt() ->> 'email' = owner_email);

CREATE POLICY "Posts are isolated to workspace" ON public.posts
  FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_email = auth.jwt() ->> 'email'));
