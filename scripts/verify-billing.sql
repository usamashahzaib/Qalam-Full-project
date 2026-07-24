BEGIN;

DO $$
DECLARE
  v_user_id UUID;
  v_claimed BOOLEAN;
  v_duplicate BOOLEAN;
BEGIN
  SELECT id INTO v_user_id FROM public.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'billing verification requires one existing user';
  END IF;

  PERFORM public.activate_plan(
    v_user_id,
    NULL,
    'Solo',
    now() + interval '30 days',
    'billing-verification-subscription',
    'monthly'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = v_user_id
      AND plan = 'Solo'
      AND customer_id = 'billing-verification-subscription'
      AND billing_cycle = 'monthly'
      AND plan_started_at IS NOT NULL
      AND reminder_sent_3d = false
      AND reminder_sent_1d = false
  ) THEN
    RAISE EXCEPTION 'activate_plan did not update the user contract';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.plan_usage
    WHERE user_id = v_user_id::TEXT
      AND plan = 'solo'
      AND cycle_start IS NOT NULL
      AND cycle_end IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'activate_plan did not update the quota window';
  END IF;

  v_claimed := public.claim_payment_webhook(
    'lemonsqueezy',
    'billing-verification-event'
  );
  v_duplicate := public.claim_payment_webhook(
    'lemonsqueezy',
    'billing-verification-event'
  );
  IF v_claimed IS NOT TRUE OR v_duplicate IS NOT FALSE THEN
    RAISE EXCEPTION 'webhook idempotency claim contract failed';
  END IF;

  INSERT INTO public.billing_checkout_sessions (
    token_hash,
    user_id,
    expires_at
  )
  VALUES (
    repeat('a', 64),
    v_user_id,
    now() + interval '7 days'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.billing_checkout_sessions
    WHERE token_hash = repeat('a', 64)
      AND user_id = v_user_id
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'durable checkout session contract failed';
  END IF;
END;
$$;

ROLLBACK;
