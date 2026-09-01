# Experiments

## Experiment Cards

### EXP-001 - Visible proof homepage promise

- Hypothesis: We believe more qualified visitors will start signup if the homepage leads with visible proof built from real experience because the previous message split attention across four product categories.
- Type: A-B
- Primary metric and threshold: signup starts per unique homepage visitor, minimum 20 percent relative lift
- Guardrail metric: resume-check starts and signup completion must not fall by more than 5 percent
- Decision rule: run for a full business cycle and the pre-calculated sample size at 95 percent confidence, then promote, iterate, or revert
- Result and verdict: awaiting baseline and traffic sizing

## Experiment Backlog

| Idea | ICE (impact/confidence/ease) | Status |
|---|---|---|
| Visible proof hero with direct and transitional CTA | 8/6/9 | implemented as new control, measure next |
| Three permissioned outcome stories near pricing | 9/8/5 | awaiting assets |
| Personalized homepage by visitor goal | 8/5/4 | backlog |
| Short signup with deferred role question | 7/5/6 | backlog |
| Homepage color-only CTA test | 2/2/9 | rejected as too small |
| Branded auth shell with password privacy guardian | 7/6/8 | implemented as new control, measure signup completion |
| Five-feature homepage pricing summary with full comparison link | 6/6/9 | implemented as new control, measure pricing visits and paid conversion |
| Career visibility workspace definition plus LinkedIn positioning loop | 8/6/8 | implemented as new control, measure hero CTA and writer activation |
| Authority, Personal, and Offer intent selector in Writer | 8/7/8 | implemented, measure hook selection and saved-draft rate by intent |

## ATS CTA measurement note

The checker sidebar and result-summary CTAs now have distinct placement values, but they are not an A-B test. Users encounter them in different contexts and at different times. Compare them as funnel diagnostics only.

Before running a CTA variant test:

- choose signup completion as the primary metric
- keep ATS Resume Studio arrival and first resume creation as guardrails
- pre-calculate the sample required for the chosen minimum detectable effect
- run through at least one to two full business cycles
- verify the traffic split for sample-ratio mismatch
- report a 95 percent confidence interval, statistical significance, and practical significance
