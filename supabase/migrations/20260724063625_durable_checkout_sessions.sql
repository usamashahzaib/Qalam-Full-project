-- Durable, opaque checkout attribution. Only a SHA-256 token hash is stored,
-- so a database read cannot reveal a usable checkout identity token.

CREATE TABLE IF NOT EXISTS public.billing_checkout_sessions (
  token_hash    TEXT        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_checkout_sessions_expiry_idx
  ON public.billing_checkout_sessions (expires_at);

ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_checkout_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_checkout_sessions TO service_role;
