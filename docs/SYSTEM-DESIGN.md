# System Design

## Scope

Qalam is a Next.js 16 application that serves public marketing pages and authenticated professional workflows. It generates and scores content, manages resumes and career evidence, publishes to LinkedIn, schedules work, handles subscriptions, and supports workspaces.

## Quality Requirements

| Requirement | Target |
|---|---|
| Availability | Public pages and core read paths remain useful when optional AI providers fail |
| Latency | Public LCP under 2.5 seconds, interaction response under 200 milliseconds in field data |
| Integrity | Payments, publishing, credits, and workspace membership are idempotent and authorized |
| Privacy | Professional evidence is scoped to the authenticated user and workspace |
| Accessibility | Keyboard, focus, contrast, labels, responsive layout, and reduced motion remain supported |
| Observability | Errors reach Sentry and health checks expose Redis and Supabase dependency state |

## Context Diagram

```text
Browser
  -> Next.js application on Vercel
       -> NextAuth session and application identity
       -> Supabase data and row-level access controls
       -> Upstash Redis for rate limits, cache, and locks
       -> QStash and cron routes for scheduled work
       -> AI provider router for generation and analysis
       -> LinkedIn APIs for publishing and analytics
       -> Lemon Squeezy for checkout and payment lifecycle
       -> Email provider for account and operational messages
       -> Sentry for error and performance telemetry
```

## Application Boundaries

| Boundary | Responsibility | Key risk |
|---|---|---|
| Public web | Positioning, pricing, tools, signup handoff | Slow media or misleading availability |
| Auth and identity | Session, signup, verification, password lifecycle | Account takeover or stale sessions |
| Workspace domain | Ownership, membership, roles, usage | Cross-workspace access |
| Career domain | Career Vault, resumes, evidence, add-ons | Sensitive context leakage |
| Content domain | Generation, scoring, versions, carousels | Unsupported claims or lost work |
| Publishing domain | LinkedIn credentials, schedules, publish locks | Duplicate publish or token exposure |
| Billing domain | Checkout, plans, credits, webhooks | Duplicate grants or entitlement drift |
| Async domain | QStash, cron, cleanup, momentum jobs | Retry duplication or silent failure |

## Main Request Paths

### Generate a proof artifact

1. The browser sends authenticated context and a validated request.
2. The route resolves identity, workspace, plan, and available credits.
3. The AI router selects an available provider and applies circuit-breaker behavior.
4. The application sanitizes and scores generated content.
5. Supabase stores the artifact and version metadata.
6. The browser receives the artifact, score, and next action.
7. The first successful writer draft records a server-owned, idempotent product event and atomically sets first activation. The browser event remains an attribution proxy.

### Publish scheduled content

1. The user schedules an approved artifact.
2. QStash is asked to deliver near the requested time.
3. A signed webhook resolves the post and obtains a publish lock.
4. LinkedIn credentials are refreshed if necessary.
5. The post is published once and the result is stored.
6. A cron safety net finds overdue work that missed QStash delivery.

### Apply a payment change

1. Checkout creates a signed server-side intent for the selected plan.
2. Lemon Squeezy completes payment.
3. The webhook validates authenticity and event identity.
4. The payment lifecycle updates entitlements idempotently.
5. The verified lifecycle records a structured server event while the payment ledger remains revenue truth.
6. Usage and plan reads resolve the new effective plan.

## Data Design Principles

- Supabase is the durable system of record.
- Workspace ID is an explicit authorization boundary on shared data.
- Redis state is disposable and cannot be the only record of money, membership, or publishing.
- External provider identifiers are stored for reconciliation and idempotency.
- Product measurement uses fixed columns and database constraints instead of free-text payloads.
- Retention reads `users.activated_at` and server events. Revenue reads the verified payment ledger.
- Generated artifacts retain versions so users can recover from edits.
- Service-role access remains server-only and routes must apply scoped checks before mutations.

## Failure Handling

| Failure | Expected behavior |
|---|---|
| AI provider unavailable | Route to another configured provider or return a recoverable error without consuming a credit |
| Redis unavailable | Fail closed for security-sensitive rate limits where required, otherwise degrade cache behavior |
| Supabase unavailable | Health endpoint reports degraded and durable mutations fail without pretending success |
| QStash delivery missed | Cron safety net locates due posts and publishes with the same idempotency guard |
| LinkedIn token expired | Refresh once, preserve schedule state, and surface a reconnect action if refresh fails |
| Duplicate payment webhook | Idempotency prevents a second entitlement grant |

## Capacity Assumptions

Initial planning assumes up to 100,000 registered accounts, 10,000 monthly active accounts, 1,000 concurrent sessions at peak, and 100,000 generation or analysis requests per month. These are design checkpoints, not observed demand. Serverless routes scale horizontally, while Redis locks and database constraints protect operations that must occur once.

## Security and Trust Boundaries

1. Validate every route input with a schema before domain logic.
2. Resolve session identity on the server and never trust client-supplied ownership.
3. Scope every workspace mutation and retain row-level protection in Supabase.
4. Keep provider keys, service-role keys, and LinkedIn credentials server-only.
5. Verify webhook and QStash signatures before processing.
6. Apply rate limits to authentication, generation, free tools, and costly routes.
7. Avoid storing resume text or professional evidence in disposable caches unless explicitly required and protected.

## Deployment and Operations

- `next typegen && tsc --noEmit` validates route-aware types in CI.
- `npm run build` performs readiness checks and a production build.
- `npm test`, `npm run lint`, `npm run check:dashes`, and RLS checks form the release gate.
- `/api/health` checks Redis and Supabase without exposing secrets.
- Sentry captures server, edge, and client failures.
- Database migrations remain reviewed, ordered, and reversible where practical.

## Architecture Scorecard

| Area | Score | Evidence | Next improvement |
|---|---:|---|---|
| Separation of concerns | 8/10 | Domain services, repositories, use cases, and server adapters exist | Reduce direct service-client use in route handlers |
| Data integrity | 8/10 | RPCs, locks, versioning, and payment lifecycle code | Document idempotency keys per mutation |
| Reliability | 8/10 | Provider routing, circuit breakers, QStash fallback, health checks | Add dependency SLOs and alert thresholds |
| Security | 8/10 | Scoped clients, server identity, rate limits, signature checks | Add automated authorization matrix tests |
| Observability | 7/10 | Sentry, logging, health route | Add trace correlation across async jobs |
| Performance | 7/10 | App Router, caching, Redis | Establish field Core Web Vitals baselines |
| Maintainability | 7/10 | Broad test suite and typed domain code | Split oversized routes and standardize error contracts |
| Operability | 7/10 | Cron health and readiness scripts | Create a concise incident runbook |

Overall design score: 7.5/10. The system is credible for the current stage. The most important next step is operational evidence, especially field performance, dependency SLOs, and authorization regression coverage.
