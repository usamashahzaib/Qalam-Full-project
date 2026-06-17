-- Rekey linkedin_credentials on user_id UUID
DROP POLICY IF EXISTS "linkedin_creds_own" ON public.linkedin_credentials;

-- Add user_id column referencing users(id)
ALTER TABLE public.linkedin_credentials ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Map existing rows using owner_email to users.id
UPDATE public.linkedin_credentials c
SET user_id = u.id
FROM public.users u
WHERE LOWER(c.owner_email) = LOWER(u.email);

-- Delete any rows that could not be mapped to avoid violation of not-null constraint
DELETE FROM public.linkedin_credentials WHERE user_id IS NULL;

-- Remove owner_email column and enforce user_id constraints
ALTER TABLE public.linkedin_credentials DROP COLUMN owner_email;
ALTER TABLE public.linkedin_credentials ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.linkedin_credentials ADD CONSTRAINT linkedin_credentials_user_id_key UNIQUE (user_id);

-- Recreate RLS policy using auth.uid()
CREATE POLICY "linkedin_creds_own" ON public.linkedin_credentials
  FOR ALL USING (user_id = auth.uid());
