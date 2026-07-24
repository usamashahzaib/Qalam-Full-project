-- ----------------------------------------------------------------
-- Agency team workflow completion:
-- 1. approvals.workspace_id - approvals were only ever scoped to the
--    requester, so switching client workspaces did not scope the
--    approval queue. Backfill from the linked post's workspace.
-- 2. managed_leads - persistence for the Managed Services application
--    form (app/managed/apply), matching the contact_submissions pattern.
-- ----------------------------------------------------------------

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.approvals a
SET workspace_id = p.workspace_id
FROM public.posts p
WHERE a.post_id = p.id
  AND a.workspace_id IS NULL
  AND p.workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approvals_workspace ON public.approvals (workspace_id, created_at DESC);

-- ----------------------------------------------------------------
-- 3. carousels.workspace_id - the legacy /api/carousel route only ever
--    scoped carousels to user_id, so an agency owner's carousels from every
--    client workspace were mixed into one bucket and invisible to invited
--    teammates. Backfill existing rows onto each user's own (owner-role)
--    workspace so nothing already saved disappears; new rows are scoped to
--    whichever client workspace was active when they were created.
-- ----------------------------------------------------------------

ALTER TABLE public.carousels
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.carousels c
SET workspace_id = owner_ws.workspace_id
FROM (
  SELECT DISTINCT ON (wm.user_id) wm.user_id, wm.workspace_id
  FROM public.workspace_members wm
  WHERE wm.role = 'owner'
  ORDER BY wm.user_id, wm.created_at ASC
) owner_ws
WHERE c.workspace_id IS NULL
  AND c.user_id = owner_ws.user_id;

CREATE INDEX IF NOT EXISTS idx_carousels_workspace ON public.carousels (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.managed_leads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  company      TEXT,
  linkedin_url TEXT,
  package      TEXT        NOT NULL,
  message      TEXT,
  ip           TEXT,
  status       TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_managed_leads_created ON public.managed_leads (created_at DESC);

ALTER TABLE public.managed_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.managed_leads FROM anon, authenticated;
