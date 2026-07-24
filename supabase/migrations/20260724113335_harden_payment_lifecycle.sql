BEGIN;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'));

ALTER TABLE public.referral_uses
  DROP CONSTRAINT IF EXISTS referral_uses_status_check;

ALTER TABLE public.referral_uses
  ADD CONSTRAINT referral_uses_status_check
  CHECK (status IN ('pending', 'verified', 'paid', 'refunded'));

ALTER TABLE public.payment_subscriptions
  ADD COLUMN IF NOT EXISTS order_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payment_subscriptions_order_idx
  ON public.payment_subscriptions (provider, order_id)
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_payment_webhook_v2(
  p_provider TEXT,
  p_event_id TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_state TEXT;
  v_started_at TIMESTAMPTZ;
  v_inserted INTEGER;
BEGIN
  INSERT INTO public.payment_webhook_events (
    provider,
    event_id,
    processing_state,
    processing_started_at,
    updated_at
  )
  VALUES (p_provider, p_event_id, 'processing', now(), now())
  ON CONFLICT (provider, event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN
    RETURN 'claimed';
  END IF;

  SELECT processing_state, processing_started_at
  INTO v_state, v_started_at
  FROM public.payment_webhook_events
  WHERE provider = p_provider AND event_id = p_event_id
  FOR UPDATE;

  IF v_state = 'completed' THEN
    RETURN 'completed';
  END IF;

  IF v_state = 'failed'
     OR (v_state = 'processing' AND v_started_at < now() - interval '90 seconds') THEN
    UPDATE public.payment_webhook_events
    SET processing_state = 'processing',
        processing_started_at = now(),
        processed_at = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE provider = p_provider AND event_id = p_event_id;
    RETURN 'claimed';
  END IF;

  RETURN 'busy';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payment_webhook_v2(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook_v2(TEXT, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.request_referral_payout(
  p_referrer_id uuid,
  p_referral_ids uuid[],
  p_amount numeric,
  p_payment_method text,
  p_account_details text
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_referrer_email text;
  v_total_commission numeric;
  v_reserved numeric;
  v_available numeric;
  v_payout_id uuid;
BEGIN
  -- Kept in the signature for deployed app compatibility. Ownership is
  -- derived in SQL and never trusted from this caller-supplied list.
  PERFORM pg_catalog.cardinality(p_referral_ids);

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_payment_method NOT IN ('jazzcash', 'easypaisa', 'bank') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  IF NULLIF(btrim(p_account_details), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_account_details';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_referrer_id::text, 0)
  );

  SELECT lower(email)
  INTO v_referrer_email
  FROM public.users
  WHERE id = p_referrer_id;

  SELECT COALESCE(SUM(ru.commission_amount), 0)
  INTO v_total_commission
  FROM public.referral_uses ru
  JOIN public.referrals r ON r.id = ru.referral_id
  WHERE ru.status = 'paid'
    AND (
      r.referrer_user_id = p_referrer_id
      OR (v_referrer_email IS NOT NULL AND lower(r.referrer_email) = v_referrer_email)
    );

  SELECT COALESCE(SUM(amount), 0)
  INTO v_reserved
  FROM public.referral_payouts
  WHERE referrer_user_id = p_referrer_id
    AND status IN ('pending', 'processing', 'paid');

  v_available := greatest(0, v_total_commission - v_reserved);
  IF p_amount > v_available THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.referral_payouts (
    referrer_user_id,
    amount,
    payment_method,
    account_details
  )
  VALUES (
    p_referrer_id,
    p_amount,
    p_payment_method,
    btrim(p_account_details)
  )
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_referral_payout(uuid, uuid[], numeric, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_referral_payout(uuid, uuid[], numeric, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.mark_referral_payout_paid(
  p_payout_id uuid,
  p_payment_reference text
) RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_referrer_email text;
  v_amount numeric;
  v_total_commission numeric;
  v_already_paid numeric;
  v_updated boolean := false;
BEGIN
  IF NULLIF(btrim(p_payment_reference), '') IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_reference';
  END IF;

  SELECT referrer_user_id, amount
  INTO v_referrer_id, v_amount
  FROM public.referral_payouts
  WHERE id = p_payout_id AND status IN ('pending', 'processing')
  FOR UPDATE;

  IF v_referrer_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_referrer_id::text, 0)
  );

  SELECT lower(email)
  INTO v_referrer_email
  FROM public.users
  WHERE id = v_referrer_id;

  SELECT COALESCE(SUM(ru.commission_amount), 0)
  INTO v_total_commission
  FROM public.referral_uses ru
  JOIN public.referrals r ON r.id = ru.referral_id
  WHERE ru.status = 'paid'
    AND (
      r.referrer_user_id = v_referrer_id
      OR (v_referrer_email IS NOT NULL AND lower(r.referrer_email) = v_referrer_email)
    );

  SELECT COALESCE(SUM(amount), 0)
  INTO v_already_paid
  FROM public.referral_payouts
  WHERE referrer_user_id = v_referrer_id
    AND status = 'paid'
    AND id <> p_payout_id;

  IF v_amount > greatest(0, v_total_commission - v_already_paid) THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.referral_payouts
  SET status = 'paid',
      payment_reference = btrim(p_payment_reference),
      processed_at = now()
  WHERE id = p_payout_id AND status IN ('pending', 'processing')
  RETURNING true INTO v_updated;

  RETURN COALESCE(v_updated, false);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_referral_payout_paid(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_referral_payout_paid(uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
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

REVOKE ALL ON FUNCTION public.delete_user_data(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID)
  TO service_role;

COMMENT ON FUNCTION public.delete_user_data(UUID) IS
  'GDPR erasure RPC. Runs only as service_role. Financial records survive through ON DELETE SET NULL.';

COMMIT;
