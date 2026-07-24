-- Migration 0044: extend delete_user_data() to remove referral records
--
-- Migration 0039 covered posts/carousels/conversations/etc but predates the
-- referral system (0043). referrals.referrer_user_id is ON DELETE SET NULL,
-- so a deleted user's referrer_name/referrer_email PII would otherwise
-- survive account deletion. Explicitly delete referrals owned by the user;
-- referral_clicks and referral_uses cascade off referrals.id.

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

  -- ── Conversations (chat) - conversation_messages cascade off this ─
  DELETE FROM conversations   WHERE user_id = target_user_id::TEXT;

  -- ── LinkedIn credentials ─────────────────────────────────────────
  DELETE FROM linkedin_credentials WHERE user_id = target_user_id::TEXT;

  -- ── Publishing accounts (LinkedIn OAuth tokens) ──────────────────
  DELETE FROM publishing_accounts WHERE workspace_id = ANY(v_workspace_ids);

  -- ── Referrals issued by this user - referral_clicks/referral_uses ─
  -- ── cascade off referrals.id ──────────────────────────────────────
  DELETE FROM referrals       WHERE referrer_user_id = target_user_id;

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

  -- ── Users row (last - breaks all remaining FK references) ────────
  DELETE FROM users           WHERE id = target_user_id;
END;
$$;
