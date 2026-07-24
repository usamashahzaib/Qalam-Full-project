-- M-07: AI spend has no cost cap. Adds a global (all-users) daily spend
-- aggregate so ai-router-v2.ts can check it before dispatching a call and
-- refuse once the configured ceiling (AI_DAILY_SPEND_CAP_USD) is hit.
--
-- Distinct from the existing get_monthly_ai_cost(p_user_id) (migration 0032),
-- which is per-user and monthly; this one is global and daily.

CREATE OR REPLACE FUNCTION public.get_daily_ai_cost()
RETURNS FLOAT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)
  FROM   public.ai_usage
  WHERE  created_at >= date_trunc('day', now());
$$;

REVOKE ALL ON FUNCTION public.get_daily_ai_cost() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_ai_cost() TO service_role;
