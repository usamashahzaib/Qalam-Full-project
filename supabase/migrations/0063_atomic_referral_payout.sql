-- requestPayout() previously read the available balance, compared it to the
-- requested amount, then inserted the payout row as two separate round trips
-- from the app server with no locking in between. Concurrent requests (e.g. a
-- burst from the same referrer) could each read the same pre-insert balance
-- and all pass the check, letting a referrer withdraw several times their
-- actual earned commission before any of the inserts land. This RPC recomputes
-- the balance and inserts the payout row in one transaction, serialized per
-- referrer via an advisory lock, so only one request per referrer can be
-- mid-flight at a time and each sees the other's already-committed effect.
CREATE OR REPLACE FUNCTION public.request_referral_payout(
  p_referrer_id uuid,
  p_referral_ids uuid[],
  p_amount numeric,
  p_payment_method text,
  p_account_details text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_total_commission numeric;
  v_reserved numeric;
  v_available numeric;
  v_payout_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Serializes concurrent payout requests for the same referrer within this
  -- transaction only (pg_advisory_xact_lock auto-releases on commit/rollback).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_referrer_id::text, 0));

  SELECT COALESCE(SUM(commission_amount), 0) INTO v_total_commission
  FROM public.referral_uses
  WHERE referral_id = ANY(p_referral_ids) AND status = 'paid';

  SELECT COALESCE(SUM(amount), 0) INTO v_reserved
  FROM public.referral_payouts
  WHERE referrer_user_id = p_referrer_id AND status IN ('pending', 'processing', 'paid');

  v_available := GREATEST(0, v_total_commission - v_reserved);

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.referral_payouts (referrer_user_id, amount, payment_method, account_details)
  VALUES (p_referrer_id, p_amount, p_payment_method, p_account_details)
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;
