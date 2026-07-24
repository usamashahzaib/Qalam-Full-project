-- Auth integration: link Supabase users to external IDs and enforce RLS.
-- --
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS external_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_external_user_id_key
  ON public.users (external_user_id)
  WHERE external_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE external_user_id = (SELECT auth.jwt()->>'sub')
  LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their profiles" ON public.users;
DROP POLICY IF EXISTS "Workspace members" ON public.workspaces;
DROP POLICY IF EXISTS "Posts in workspace" ON public.posts;
DROP POLICY IF EXISTS "Voice profiles in workspace" ON public.voice_profiles;
DROP POLICY IF EXISTS "Carousel projects in workspace" ON public.carousel_projects;

-- Users can only see their own data
CREATE POLICY "Users own their profiles" ON public.users
  FOR ALL USING (external_user_id = (SELECT auth.jwt()->>'sub'));

-- Workspaces - members only
CREATE POLICY "Workspace members" ON public.workspaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.workspace_id = workspaces.id
        AND memberships.user_id = public.requesting_user_id()
    )
  );

-- Posts - workspace members
CREATE POLICY "Posts in workspace" ON public.posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.workspace_id = posts.workspace_id
        AND memberships.user_id = public.requesting_user_id()
    )
  );

-- Voice profiles - workspace members
CREATE POLICY "Voice profiles in workspace" ON public.voice_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.workspace_id = voice_profiles.workspace_id
        AND memberships.user_id = public.requesting_user_id()
    )
  );

-- Carousel projects - workspace members
CREATE POLICY "Carousel projects in workspace" ON public.carousel_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.workspace_id = carousel_projects.workspace_id
        AND memberships.user_id = public.requesting_user_id()
    )
  );
