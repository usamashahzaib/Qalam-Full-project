-- Optional usage counter for the Comment Generator free-tool quota.
-- Purely additive: new nullable-defaulted column, no changes to existing
-- columns, RPCs, or enforcement for any other feature.
ALTER TABLE public.plan_usage
  ADD COLUMN IF NOT EXISTS comment_generations_used INTEGER NOT NULL DEFAULT 0;
