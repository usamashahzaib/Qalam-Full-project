BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activation_workflow TEXT;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_activation_workflow_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_activation_workflow_check
  CHECK (activation_workflow IS NULL OR activation_workflow IN ('writer_draft_generated'));

CREATE TABLE IF NOT EXISTS public.product_events (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id           UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_name             TEXT        NOT NULL,
  idempotency_key        TEXT        NOT NULL,
  source                 TEXT        NOT NULL DEFAULT 'server',
  schema_version         SMALLINT    NOT NULL DEFAULT 1,
  content_type           TEXT,
  plan_name              TEXT,
  billing_cycle          TEXT,
  payment_provider       TEXT,
  payment_transaction_id TEXT,
  payment_status         TEXT,
  occurred_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_events_name_check CHECK (event_name IN (
    'writer_draft_generated',
    'checkout_paid',
    'entitlement_activated',
    'subscription_renewed',
    'payment_failed',
    'payment_refunded',
    'subscription_cancelled',
    'subscription_expired'
  )),
  CONSTRAINT product_events_source_check CHECK (source IN ('server', 'backfill')),
  CONSTRAINT product_events_schema_version_check CHECK (schema_version > 0),
  CONSTRAINT product_events_content_type_check CHECK (
    content_type IS NULL OR content_type IN ('linkedin_post')
  ),
  CONSTRAINT product_events_plan_check CHECK (
    plan_name IS NULL OR plan_name IN ('Free', 'Solo', 'Pro', 'Agency', 'Agency Starter', 'Agency Growth')
  ),
  CONSTRAINT product_events_billing_cycle_check CHECK (
    billing_cycle IS NULL OR billing_cycle IN ('monthly', 'quarterly', 'annual')
  ),
  CONSTRAINT product_events_payment_provider_check CHECK (
    payment_provider IS NULL OR payment_provider IN ('stripe', 'jazzcash', 'easypaisa', 'lemonsqueezy')
  ),
  CONSTRAINT product_events_payment_status_check CHECK (
    payment_status IS NULL OR payment_status IN ('paid', 'failed', 'cancelled', 'partially_refunded', 'refunded')
  ),
  CONSTRAINT product_events_shape_check CHECK (
    (
      event_name = 'writer_draft_generated'
      AND content_type = 'linkedin_post'
      AND plan_name IS NULL
      AND billing_cycle IS NULL
      AND payment_provider IS NULL
      AND payment_transaction_id IS NULL
      AND payment_status IS NULL
    )
    OR
    (
      event_name <> 'writer_draft_generated'
      AND content_type IS NULL
      AND plan_name IN ('Solo', 'Pro', 'Agency', 'Agency Starter', 'Agency Growth')
      AND billing_cycle IS NOT NULL
      AND payment_provider IS NOT NULL
      AND payment_transaction_id IS NOT NULL
      AND payment_status IS NOT NULL
    )
  ),
  UNIQUE (user_id, event_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS product_events_user_occurred_idx
  ON public.product_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS product_events_workspace_occurred_idx
  ON public.product_events (workspace_id, occurred_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_events_name_occurred_idx
  ON public.product_events (event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS product_events_payment_reconciliation_idx
  ON public.product_events (payment_provider, payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.product_events TO service_role;

CREATE OR REPLACE FUNCTION public.record_product_event_v1(
  p_user_id UUID,
  p_workspace_id UUID,
  p_event_name TEXT,
  p_idempotency_key TEXT,
  p_source TEXT DEFAULT 'server',
  p_content_type TEXT DEFAULT NULL,
  p_plan_name TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT NULL,
  p_payment_provider TEXT DEFAULT NULL,
  p_payment_transaction_id TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT now()
) RETURNS TABLE(event_id UUID, inserted BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF length(btrim(p_idempotency_key)) < 8 OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'invalid_product_event_idempotency_key';
  END IF;

  IF p_workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'product_event_workspace_mismatch';
  END IF;

  INSERT INTO public.product_events (
    user_id,
    workspace_id,
    event_name,
    idempotency_key,
    source,
    content_type,
    plan_name,
    billing_cycle,
    payment_provider,
    payment_transaction_id,
    payment_status,
    occurred_at
  ) VALUES (
    p_user_id,
    p_workspace_id,
    p_event_name,
    btrim(p_idempotency_key),
    p_source,
    p_content_type,
    p_plan_name,
    p_billing_cycle,
    p_payment_provider,
    p_payment_transaction_id,
    p_payment_status,
    COALESCE(p_occurred_at, now())
  )
  ON CONFLICT (user_id, event_name, idempotency_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT pe.id INTO v_event_id
    FROM public.product_events pe
    WHERE pe.user_id = p_user_id
      AND pe.event_name = p_event_name
      AND pe.idempotency_key = btrim(p_idempotency_key);

    RETURN QUERY SELECT v_event_id, false;
    RETURN;
  END IF;

  IF p_event_name = 'writer_draft_generated' THEN
    UPDATE public.users
    SET activated_at = COALESCE(activated_at, COALESCE(p_occurred_at, now())),
        activation_workflow = COALESCE(activation_workflow, p_event_name),
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT v_event_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_product_event_v1(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_product_event_v1(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

INSERT INTO public.product_events (
  user_id,
  workspace_id,
  event_name,
  idempotency_key,
  source,
  content_type,
  occurred_at
)
SELECT
  u.id,
  p.workspace_id,
  'writer_draft_generated',
  'backfill:post:' || p.id::text,
  'backfill',
  'linkedin_post',
  p.created_at
FROM public.posts p
JOIN public.users u
  ON p.user_id = u.id::text OR p.user_id = u.external_user_id
ON CONFLICT (user_id, event_name, idempotency_key) DO NOTHING;

UPDATE public.users u
SET activated_at = first_event.occurred_at,
    activation_workflow = 'writer_draft_generated',
    updated_at = now()
FROM (
  SELECT user_id, min(occurred_at) AS occurred_at
  FROM public.product_events
  WHERE event_name = 'writer_draft_generated'
  GROUP BY user_id
) first_event
WHERE u.id = first_event.user_id
  AND u.activated_at IS NULL;

CREATE OR REPLACE VIEW public.product_retention_cohorts AS
WITH activations AS (
  SELECT id AS user_id, date_trunc('week', activated_at) AS cohort_week, activated_at
  FROM public.users
  WHERE activated_at IS NOT NULL
), returns AS (
  SELECT
    a.user_id,
    a.cohort_week,
    floor(extract(epoch FROM (pe.occurred_at - a.activated_at)) / 604800)::INTEGER AS week_number
  FROM activations a
  JOIN public.product_events pe ON pe.user_id = a.user_id
  WHERE pe.event_name = 'writer_draft_generated'
    AND pe.occurred_at >= a.activated_at
)
SELECT
  cohort_week,
  week_number,
  count(DISTINCT user_id) AS retained_users
FROM returns
WHERE week_number BETWEEN 0 AND 12
GROUP BY cohort_week, week_number;

CREATE OR REPLACE VIEW public.payment_conversion_facts AS
SELECT
  p.id AS payment_id,
  p.user_id,
  p.organization_id,
  p.provider,
  p.transaction_id,
  p.plan_name,
  p.billing_cycle,
  p.amount,
  p.currency,
  p.status,
  p.processed_at,
  u.activated_at,
  CASE
    WHEN u.activated_at IS NULL THEN NULL
    ELSE extract(epoch FROM (p.processed_at - u.activated_at)) / 86400
  END AS days_from_activation
FROM public.payments p
LEFT JOIN public.users u ON u.id = p.user_id;

REVOKE ALL ON public.product_retention_cohorts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.payment_conversion_facts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_retention_cohorts TO service_role;
GRANT SELECT ON public.payment_conversion_facts TO service_role;

COMMENT ON TABLE public.product_events IS
  'Server-owned product measurement events with user-scoped idempotency and no free-text payload.';
COMMENT ON VIEW public.payment_conversion_facts IS
  'Authoritative payment conversion facts sourced from verified provider webhooks, not browser events.';

COMMIT;

-- Rollback guidance:
-- DROP VIEW IF EXISTS public.payment_conversion_facts;
-- DROP VIEW IF EXISTS public.product_retention_cohorts;
-- DROP FUNCTION IF EXISTS public.record_product_event_v1(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);
-- DROP TABLE IF EXISTS public.product_events;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS activation_workflow;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS activated_at;
