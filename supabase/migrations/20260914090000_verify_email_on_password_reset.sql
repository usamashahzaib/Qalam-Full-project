-- A valid reset token proves control of the account email. Mark the address
-- verified in the same transaction that installs the new password so an
-- OAuth-only account can safely add credentials and sign in immediately.
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
      email_verified = true,
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
