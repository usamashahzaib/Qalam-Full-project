-- The production schema deliberately contains both legacy TEXT user IDs and
-- UUID foreign keys. The previous function cast every target to TEXT, causing
-- UUID columns to fail with "operator does not exist: uuid = text".
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(workspace_id) INTO v_workspace_ids
  FROM public.workspace_members
  WHERE user_id = target_user_id::TEXT;

  DELETE FROM public.ai_usage WHERE user_id = target_user_id;
  DELETE FROM public.scheduling_notifications WHERE user_id = target_user_id;
  DELETE FROM public.approvals WHERE post_id IN (
    SELECT id FROM public.posts WHERE user_id = target_user_id::TEXT
  );
  DELETE FROM public.post_versions WHERE post_id IN (
    SELECT id FROM public.posts WHERE user_id = target_user_id::TEXT
  );
  DELETE FROM public.analytics_snapshots WHERE user_id = target_user_id;
  DELETE FROM public.posts WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.carousels WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.voice_profiles WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.voice_examples WHERE user_id = target_user_id;
  DELETE FROM public.competitor_analyses WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.conversations WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.linkedin_credentials WHERE user_id = target_user_id;

  IF to_regclass('public.publishing_accounts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.publishing_accounts WHERE workspace_id = ANY($1)'
      USING v_workspace_ids;
  END IF;

  DELETE FROM public.referrals WHERE referrer_user_id = target_user_id;
  DELETE FROM public.plan_usage
    WHERE user_id = target_user_id::TEXT OR user_uuid = target_user_id;
  DELETE FROM public.user_overrides WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.workspace_members WHERE user_id = target_user_id::TEXT;
  DELETE FROM public.workspaces
    WHERE owner_id = target_user_id::TEXT
      AND id NOT IN (SELECT workspace_id FROM public.workspace_members);
  DELETE FROM public.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;

COMMENT ON FUNCTION public.delete_user_data(UUID) IS
  'GDPR erasure RPC. Runs only as service_role. Mixed TEXT and UUID user references are compared using their actual column types. Financial records survive through ON DELETE SET NULL.';
