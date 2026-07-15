-- ----------------------------------------------------------------
-- Silent Growth: Engagement Ledger persistence.
--
-- Previously the Engagement Ledger tab only wrote to browser
-- localStorage, so entries vanished on device switch or storage
-- clear. This table backs it with real per-user storage, matching
-- the other three Silent Growth tabs which are already API-backed.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.engagement_ledger (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  engaged_date   DATE        NOT NULL,
  reciprocate_by DATE        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_ledger_user_id ON public.engagement_ledger (user_id, created_at DESC);

ALTER TABLE public.engagement_ledger ENABLE ROW LEVEL SECURITY;
