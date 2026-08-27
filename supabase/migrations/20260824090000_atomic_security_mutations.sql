-- Keep password replacement and session revocation in one database transaction.
CREATE OR REPLACE FUNCTION public.set_user_password_and_revoke(
  target_user_id uuid,
  new_password_hash text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL OR new_password_hash IS NULL OR length(new_password_hash) < 20 THEN
    RETURN false;
  END IF;

  UPDATE public.users
  SET password_hash = new_password_hash,
      password_version = password_version + 1,
      updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_password_and_revoke(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_password_and_revoke(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_user_password_and_revoke(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_password_and_revoke(uuid, text) TO service_role;

-- Lock a referral row while validating its capacity and recording a use.
CREATE OR REPLACE FUNCTION public.redeem_referral_code(
  raw_code text,
  target_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_row public.referrals%ROWTYPE;
  target_email text;
BEGIN
  IF target_user_id IS NULL OR nullif(trim(raw_code), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'invalid_referral_code');
  END IF;

  SELECT * INTO referral_row
  FROM public.referrals
  WHERE referral_code = upper(trim(raw_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'Referral code not found.');
  END IF;
  IF NOT referral_row.is_active THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'Referral code is inactive.');
  END IF;
  IF referral_row.expires_at IS NOT NULL AND referral_row.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'Referral code has expired.');
  END IF;
  IF referral_row.max_uses IS NOT NULL AND referral_row.used_count >= referral_row.max_uses THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'Referral code has reached its usage limit.');
  END IF;
  IF referral_row.referrer_user_id = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'self_referral_not_allowed');
  END IF;

  SELECT lower(trim(email)) INTO target_email
  FROM public.users
  WHERE id = target_user_id;

  IF target_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'referred_user_not_found');
  END IF;
  IF target_email = lower(trim(referral_row.referrer_email)) THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'self_referral_not_allowed');
  END IF;
  IF EXISTS (SELECT 1 FROM public.referral_uses WHERE referred_user_id = target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'referral_already_used');
  END IF;

  INSERT INTO public.referral_uses (referral_id, referred_user_id, discount_applied)
  VALUES (referral_row.id, target_user_id, referral_row.discount_percent);

  UPDATE public.referrals
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = referral_row.id;

  UPDATE public.plan_usage
  SET referral_discount_percent = referral_row.discount_percent,
      updated_at = now()
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'discount_percent', referral_row.discount_percent,
    'referral_id', referral_row.id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'discount_percent', 0, 'error', 'referral_already_used');
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_referral_code(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_referral_code(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_referral_code(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text, uuid) TO service_role;
