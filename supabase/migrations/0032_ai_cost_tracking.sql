-- Migration 0032: AI usage cost tracking
-- Tracks every AI call with token counts and estimated cost.
-- Enables per-user monthly caps and cost attribution.

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  provider         TEXT        NOT NULL CHECK (provider IN ('groq', 'gemini')),
  model            TEXT        NOT NULL,
  tokens_in        INTEGER     NOT NULL DEFAULT 0,
  tokens_out       INTEGER     NOT NULL DEFAULT 0,
  estimated_cost_usd FLOAT    NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id    ON public.ai_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage (created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
-- Only service role reads/writes; no client-side access needed.
CREATE POLICY "service_role_only" ON public.ai_usage
  USING (false) WITH CHECK (false);

-- Monthly spend aggregation helper (used by cost-cap enforcement)
CREATE OR REPLACE FUNCTION public.get_monthly_ai_cost(p_user_id UUID)
RETURNS FLOAT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)
  FROM   public.ai_usage
  WHERE  user_id = p_user_id
    AND  created_at >= date_trunc('month', now());
$$;
