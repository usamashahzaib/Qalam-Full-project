BEGIN;

ALTER TABLE public.user_overrides
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_overrides_expires_at
  ON public.user_overrides (expires_at);

COMMIT;
