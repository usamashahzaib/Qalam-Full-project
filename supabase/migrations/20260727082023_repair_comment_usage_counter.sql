-- Repair schema drift: migration 20260723000300 is recorded as applied in
-- production, but the Comment Generator usage column is absent.
ALTER TABLE public.plan_usage
  ADD COLUMN IF NOT EXISTS comment_generations_used INTEGER NOT NULL DEFAULT 0;
