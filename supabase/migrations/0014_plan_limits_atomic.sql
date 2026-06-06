-- Atomic plan usage counters (Redis backup, but DB source of truth)
DROP TABLE IF EXISTS plan_usage CASCADE;

CREATE TABLE plan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  workspace_id UUID,
  plan TEXT NOT NULL DEFAULT 'free',
  -- Monthly counters (reset on billing cycle)
  ai_drafts_used INTEGER NOT NULL DEFAULT 0,
  carousels_used INTEGER NOT NULL DEFAULT 0,
  hooks_used INTEGER NOT NULL DEFAULT 0,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  -- Cycle tracking
  cycle_start TIMESTAMPTZ DEFAULT now(),
  cycle_end TIMESTAMPTZ DEFAULT (now() + interval '1 month'),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage" ON plan_usage
  FOR SELECT USING (user_id = auth.uid()::text);

-- Only backend can update (service role or RPC)
CREATE POLICY "Service role can update usage" ON plan_usage
  FOR UPDATE USING (false) WITH CHECK (false);

-- Stored procedure for atomic increment
CREATE OR REPLACE FUNCTION increment_plan_usage(
  p_user_id TEXT,
  p_field TEXT,
  p_max_allowed INTEGER
)
RETURNS JSONB AS $$
DECLARE
  current_val INTEGER;
  updated_rows INTEGER;
BEGIN
  IF p_field NOT IN ('ai_drafts_used', 'carousels_used', 'hooks_used', 'analyses_used') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid_field');
  END IF;

  -- Get current value with lock
  SELECT CASE p_field
    WHEN 'ai_drafts_used' THEN ai_drafts_used
    WHEN 'carousels_used' THEN carousels_used
    WHEN 'hooks_used' THEN hooks_used
    WHEN 'analyses_used' THEN analyses_used
  END INTO current_val
  FROM plan_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_val IS NULL THEN
    -- Initialize if not exists
    INSERT INTO plan_usage (user_id, plan)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    current_val := 0;
  END IF;

  IF current_val >= p_max_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'current', current_val, 'limit', p_max_allowed);
  END IF;

  -- Atomic increment
  UPDATE plan_usage
  SET ai_drafts_used = CASE WHEN p_field = 'ai_drafts_used' THEN ai_drafts_used + 1 ELSE ai_drafts_used END,
      carousels_used = CASE WHEN p_field = 'carousels_used' THEN carousels_used + 1 ELSE carousels_used END,
      hooks_used = CASE WHEN p_field = 'hooks_used' THEN hooks_used + 1 ELSE hooks_used END,
      analyses_used = CASE WHEN p_field = 'analyses_used' THEN analyses_used + 1 ELSE analyses_used END,
      updated_at = now()
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'update_failed');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'current', current_val + 1, 'limit', p_max_allowed);
END;
$$ LANGUAGE plpgsql;

-- Function to get or create usage record
CREATE OR REPLACE FUNCTION get_or_create_plan_usage(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  result plan_usage%ROWTYPE;
BEGIN
  SELECT * INTO result FROM plan_usage WHERE user_id = p_user_id;

  IF result.id IS NULL THEN
    INSERT INTO plan_usage (user_id, plan)
    VALUES (p_user_id, 'free')
    RETURNING * INTO result;
  END IF;

  RETURN to_jsonb(result);
END;
$$ LANGUAGE plpgsql;
