-- Migration 0039: GDPR right-to-erasure (Article 17)
--
-- Creates a delete_user_data(target_user_id UUID) RPC that removes all
-- PII and user-generated data for a given internal user UUID.
-- Cascade order respects FK constraints (children before parents).
-- Called from DELETE /api/user/delete (server-side, service role only).

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  -- Collect workspace IDs owned/shared by this user for FK cleanup
  SELECT ARRAY_AGG(workspace_id) INTO v_workspace_ids
  FROM workspace_members
  WHERE user_id = target_user_id::TEXT;

  -- ── AI cost tracking ────────────────────────────────────────────
  DELETE FROM ai_usage        WHERE user_id = target_user_id::TEXT;

  -- ── Scheduling notifications ────────────────────────────────────
  DELETE FROM scheduling_notifications WHERE user_id = target_user_id::TEXT;

  -- ── Approvals ───────────────────────────────────────────────────
  DELETE FROM approvals       WHERE post_id IN (
    SELECT id FROM posts WHERE user_id = target_user_id::TEXT
  );

  -- ── Post versions ───────────────────────────────────────────────
  DELETE FROM post_versions   WHERE post_id IN (
    SELECT id FROM posts WHERE user_id = target_user_id::TEXT
  );

  -- ── Analytics snapshots ─────────────────────────────────────────
  DELETE FROM analytics_snapshots WHERE user_id = target_user_id::TEXT;

  -- ── Posts ───────────────────────────────────────────────────────
  DELETE FROM posts           WHERE user_id = target_user_id::TEXT;

  -- ── Carousels ───────────────────────────────────────────────────
  DELETE FROM carousels       WHERE user_id = target_user_id::TEXT;

  -- ── Voice profiles ──────────────────────────────────────────────
  DELETE FROM voice_profiles  WHERE user_id = target_user_id::TEXT;

  -- ── Voice embeddings ────────────────────────────────────────────
  DELETE FROM voice_embeddings WHERE user_id = target_user_id::TEXT;

  -- ── Competitor analyses ─────────────────────────────────────────
  DELETE FROM competitor_analyses WHERE user_id = target_user_id::TEXT;

  -- ── Conversations ───────────────────────────────────────────────
  DELETE FROM conversations   WHERE user_id = target_user_id::TEXT;

  -- ── LinkedIn credentials ─────────────────────────────────────────
  DELETE FROM linkedin_credentials WHERE user_id = target_user_id::TEXT;

  -- ── Publishing accounts (LinkedIn OAuth tokens) ──────────────────
  DELETE FROM publishing_accounts WHERE workspace_id = ANY(v_workspace_ids);

  -- ── Plan usage ───────────────────────────────────────────────────
  DELETE FROM plan_usage      WHERE user_id = target_user_id::TEXT
                                  OR user_uuid = target_user_id;

  -- ── User overrides ───────────────────────────────────────────────
  DELETE FROM user_overrides  WHERE user_id = target_user_id::TEXT;

  -- ── Workspace membership (removes access to shared workspaces) ───
  DELETE FROM workspace_members WHERE user_id = target_user_id::TEXT;

  -- ── Owned workspaces (only if user is sole member) ───────────────
  DELETE FROM workspaces
  WHERE owner_id = target_user_id
    AND id NOT IN (SELECT workspace_id FROM workspace_members);

  -- ── Users row (last — breaks all remaining FK references) ────────
  DELETE FROM users           WHERE id = target_user_id;
END;
$$;

-- Only the service role (used by the API) may call this function.
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;
