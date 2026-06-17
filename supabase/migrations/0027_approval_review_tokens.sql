ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS review_token_hash text;

CREATE INDEX IF NOT EXISTS idx_approvals_review_token_hash
  ON public.approvals (review_token_hash);
