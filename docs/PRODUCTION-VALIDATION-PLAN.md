# Production Validation Plan

Repository work has removed the former preview analytics blocker, added build-time readiness checks, and added durable activation and payment measurement. The items below still require deployment access, live integrations, elapsed time, or an operational decision.

## Release sequence

1. Apply `supabase/migrations/20260825183000_product_measurement_events.sql` to preview.
2. Configure a dedicated preview GA4 ID as `NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID`.
3. Set `STRICT_ANALYTICS_READINESS=1` for the preview validation build.
4. Run `npm run check:analytics`. Preview and production IDs must be valid and different.
5. Deploy preview and complete the event walk below.
6. Apply the migration to production.
7. Configure `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the production build environment. Production builds fail without it.
8. Deploy production and repeat the event walk in GA4 Realtime.

## Browser event walk

| Event | Action | Expected properties |
|---|---|---|
| `homepage_view` | Open the homepage | none |
| `homepage_primary_cta_click` | Use hero and final CTAs | `placement` only |
| `resume_check_start` | Start upload, paste, and full checker paths | `placement`, `method` only |
| `assessment_complete` | Complete an ATS review | assessment name, score band, job-description boolean |
| `signup_complete` | Create a credential account | credential method and verification-email boolean |
| `activation` | Generate the first writer draft | workflow and content type only |
| `paid_conversion` | Return from checkout and wait for server-confirmed paid plan | paid plan and `server_confirmed` |

Inspect GA4 DebugView. No event may contain email, name, user ID, resume text, job description text, topic, draft text, exact score, customer ID, order ID, or payment amount.

## Durable measurement checks

| Check | Expected result |
|---|---|
| Generate one writer draft | one `writer_draft_generated` row and `users.activated_at` set |
| Replay the same generation idempotency key | no second product event |
| Generate again with a new key | another workflow event, unchanged first activation time |
| Replay a completed payment webhook | no second payment, entitlement, or product event |
| Query `product_retention_cohorts` | cohort and week-zero activity include the activated account |
| Query `payment_conversion_facts` | verified payment row joins to activation when the user activated |

## Time-dependent evidence

| Evidence | Minimum wait or dependency |
|---|---|
| 28-day funnel baseline | 28 days of stable instrumentation and traffic |
| Week-1, week-2, and week-4 retention | 4 weeks after the first valid cohort |
| ATS-first versus writer-first retention | enough users in each first-action segment |
| Field LCP, INP, and CLS | real-user monitoring on production devices and networks |
| Customer outcome evidence | permissioned interviews and outcome records |

## Operational checks

- Restore a production-like backup and record recovery point and recovery time.
- Define alerts for payment webhook failures, product event failures, Redis degradation, Supabase degradation, and publishing retries.
- Send a real Lemon Squeezy test-mode redelivery and confirm claim behavior.
- Publish through a real LinkedIn test account and confirm the lock and cron fallback do not duplicate.

## Local reliability status

The previously unnamed unit-test flake was reproduced with seed `1553046900`. The failing test imported `pdf-lib` even though it only tested entitlement wiring, and it timed out under shuffled worker contention. The PDF module is now mocked in that test. The exact seed passes the full suite, and `npm run test:reliability` preserves JSON and log output for every future seeded run.

## Remaining blockers to production confidence

These are not safely closeable from the repository alone:

- the migration has not been applied to the deployed database in this session
- preview and production GA IDs have not been confirmed in the deployment platform
- no live event walk has been observed in GA4
- no four-week retention cohort exists yet
- no field performance dataset exists
- no restore drill or alert threshold evidence was available
