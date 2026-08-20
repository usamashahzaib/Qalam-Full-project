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
| Resume check completion | not instrumented | establish 28-day baseline | inspect upload and input abandonment |
| Signup completion | not instrumented | establish 28-day baseline | inspect field and verification drop-off |
| Activation | not instrumented | define product event and baseline | simplify first-session path |
| LCP | browser lab check pending | under 2.5 seconds | optimize the measured LCP resource |
| INP | field data pending | under 200 milliseconds | profile the highest-latency interaction |
| CLS | field data pending | under 0.1 | reserve unstable layout space |

## Marketing Event Map

| Event | Trigger | Status |
|---|---|---|
| homepage_view | Homepage renders | instrumented |
| homepage_primary_cta_click | Hero or final account CTA | instrumented |
| resume_check_start | Checker anchor, upload, paste, or full-checker link | instrumented |
| signup_complete | Credential signup succeeds | instrumented |
| paid_conversion | Paid plan activation is confirmed after checkout | instrumented |
| activation | First meaningful product workflow completes | pending definition |
