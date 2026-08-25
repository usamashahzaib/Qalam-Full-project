# Analytics Architecture

## Decision

Qalam uses two measurement layers because acquisition attribution and durable product truth have different failure modes.

1. GA4 records anonymous marketing funnel events. It is best effort and must never break a user workflow.
2. Supabase records server-owned activation and payment lifecycle facts. These events are linked to internal user and workspace identities and use database idempotency.

Browser events are useful for attribution. They are not the source of truth for retention or revenue.

## Environment routing

| Deployment | Environment value | GA property | Release behavior |
|---|---|---|---|
| Production | `NEXT_PUBLIC_QALAM_ENV=production` or Vercel production | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Build fails if the ID is missing or malformed |
| Preview | `NEXT_PUBLIC_QALAM_ENV=preview` or Vercel preview | `NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID` | Silent with a warning if missing; set `STRICT_ANALYTICS_READINESS=1` to fail |
| Development | any unrecognized value or development | none | Analytics disabled |

Production and preview IDs must differ. `npm run check:analytics` enforces the policy, and `prebuild` runs the check automatically. IDs are build-time public values, so changing one requires a new deployment.

## Browser event contract

`lib/marketing-events.ts` contains an exact schema for every event. The runtime switch copies only named fields and accepted enum or boolean values. Unknown keys are discarded even if a caller bypasses TypeScript. Invalid required values drop the event.

No browser event accepts email, name, account ID, resume text, job description text, topic, draft text, order ID, customer ID, or exact assessment score.

| Event | Accepted properties |
|---|---|
| `homepage_view` | none |
| `homepage_primary_cta_click` | `placement` |
| `resume_check_start` | `placement`, `method` |
| `assessment_complete` | `assessment`, `score_band`, `job_description_supplied` |
| `signup_complete` | `method`, `verification_email_sent` |
| `activation` | `workflow`, `content_type` |
| `paid_conversion` | `plan`, `confirmation=server_confirmed` |

## Durable product facts

Migration `20260825183000_product_measurement_events.sql` adds:

- `users.activated_at` and `users.activation_workflow`
- `product_events` with fixed columns and no free-text payload
- `record_product_event_v1`, restricted to `service_role`
- user, workspace, and event idempotency through `UNIQUE (user_id, event_name, idempotency_key)`
- activation backfill from existing posts
- retention and payment conversion views

The writer API records `writer_draft_generated` after a successful generation, including cache hits. The client creates a UUID for the generation attempt. The server supplies the authenticated user and authorized workspace. The database sets first activation atomically.

Payment lifecycle events originate only after a provider signature and webhook claim are verified. The `payments` ledger remains the authoritative revenue source because it owns the provider transaction uniqueness constraint. `payment_conversion_facts` reads that ledger, not `paid_conversion` from the browser.

## Failure policy

- GA failure is swallowed. A successful signup, assessment, generation, or payment confirmation remains successful.
- Product event failure is logged as `product_event.record_failed` without including user content.
- Payment and activation facts are idempotent when retried.
- A missing migration is visible in server logs and release validation. It does not turn a completed user action into an error page.

## Queries

- Funnel attribution: GA4 exploration using the browser event contract.
- Activation cohort: `users.activated_at` or `product_retention_cohorts`.
- Revenue and activated-to-paid conversion: `payment_conversion_facts`.
- Reconciliation: compare `product_events.payment_transaction_id` to `payments.transaction_id` by provider.

## Required production checks

1. Apply the migration and verify the RPC with the service role.
2. Deploy preview with a dedicated preview GA property and `STRICT_ANALYTICS_READINESS=1`.
3. Walk all seven browser events in GA4 DebugView and inspect every property.
4. Generate two drafts with the same idempotency key and confirm one `product_events` row.
5. Replay a signed payment fixture and confirm the payment ledger, lifecycle event, and entitlement do not duplicate.
6. Run the first retention query after enough real time has elapsed. Week-4 retention cannot be inferred locally.
