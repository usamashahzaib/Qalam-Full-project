# Metrics

## Funnel

Homepage visit -> primary CTA click -> signup start -> signup complete -> first useful action -> paid conversion -> retained active user

Transitional path: homepage visit -> resume check start -> result viewed -> signup start -> signup complete

## Stage and One Metric That Matters

| Stage | Metric |
|---|---|
| Homepage | Primary CTA click-through rate |
| Free tool | Completed resume checks |
| Signup | Signup completion rate |
| Activation | Users completing one meaningful workflow in the first session |
| Revenue | Activated user to paid conversion |
| Retention | Monthly retained activated users |

## Baselines and Targets

| Metric | Baseline | Initial target | Miss response |
|---|---|---|---|
| Homepage primary CTA CTR | not instrumented | establish 28-day baseline | verify events and segment by source |
| Resume check completion | event instrumented | establish 28-day baseline | inspect upload and input abandonment |
| Signup completion | not instrumented | establish 28-day baseline | inspect field and verification drop-off |
| Activation | durable writer draft event implemented | establish 28-day baseline | simplify first-session path |
| Activated to paid | authoritative payment view implemented | establish 28-day baseline | inspect pricing and checkout friction |
| LCP | browser lab check pending | under 2.5 seconds | optimize the measured LCP resource |
| INP | field data pending | under 200 milliseconds | profile the highest-latency interaction |
| CLS | field data pending | under 0.1 | reserve unstable layout space |

## Marketing Event Map

| Event | Trigger | Status |
|---|---|---|
| homepage_view | Homepage renders | instrumented |
| homepage_primary_cta_click | Hero or final account CTA | instrumented |
| resume_check_start | Checker anchor, upload, paste, or full-checker link | instrumented |
| assessment_complete | A complete ATS resume result is returned | instrumented |
| signup_complete | Credential signup succeeds | instrumented |
| paid_conversion | Paid plan activation is confirmed after checkout | instrumented |
| activation | First writer draft completes once per workflow session | instrumented |

## Measurement Contract

- Activation is the first successful writer draft generated for an authenticated account. `users.activated_at` is the durable source of truth.
- The browser `activation` event is an immediate attribution proxy and is deduplicated per browser session.
- Assessment completion is separate from activation because the resume checker can be used before account creation.
- Primary retention view: percentage of activated accounts that complete another meaningful workflow in weeks 1, 2, and 4.
- Revenue comes from verified provider webhooks in `payments`, exposed for analysis through `payment_conversion_facts`. The browser `paid_conversion` event is not revenue truth.
- Counter-metric: failed or abandoned generation attempts per activated account.
- Acquisition remains evidence-gated until a 28-day activation baseline and a week-4 retention cohort exist.

The full event, privacy, environment, and ownership contract is in `docs/ANALYTICS-ARCHITECTURE.md`.
