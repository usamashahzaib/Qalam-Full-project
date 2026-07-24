-- One durable claim per provider event. This prevents webhook retries from
-- repeating plan activation, email, referral, and subscription side effects.

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  provider              TEXT        NOT NULL,
  event_id               TEXT        NOT NULL,
  processing_state       TEXT        NOT NULL DEFAULT 'processing'
    CHECK (processing_state IN ('processing', 'completed', 'failed')),
  processing_started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at           TIMESTAMPTZ,
  last_error             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.claim_payment_webhook(
  p_provider TEXT,
  p_event_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_claimed BOOLEAN := false;
BEGIN
  INSERT INTO public.payment_webhook_events (
    provider,
    event_id,
    processing_state,
    processing_started_at,
    updated_at
  )
  VALUES (p_provider, p_event_id, 'processing', now(), now())
  ON CONFLICT (provider, event_id) DO UPDATE
  SET processing_state      = 'processing',
      processing_started_at = now(),
      processed_at          = NULL,
      last_error            = NULL,
      updated_at            = now()
  WHERE public.payment_webhook_events.processing_state = 'failed'
     OR (
       public.payment_webhook_events.processing_state = 'processing'
       AND public.payment_webhook_events.processing_started_at < now() - interval '5 minutes'
     )
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payment_webhook(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_webhook(TEXT, TEXT)
  TO service_role;
