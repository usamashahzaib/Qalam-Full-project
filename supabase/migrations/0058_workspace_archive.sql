-- ----------------------------------------------------------------
-- Agency Phase 1: archive inactive client workspaces instead of only
-- ever accumulating them. archived_at IS NULL means active.
-- ----------------------------------------------------------------

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_workspaces_archived_at ON public.workspaces (archived_at);
