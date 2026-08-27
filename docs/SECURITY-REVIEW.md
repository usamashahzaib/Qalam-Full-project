# Security Review

Date: 2026-08-25. Defensive review of the application's own code. Findings are reported only
where code or a test demonstrates them. Hypotheses that were checked and disproved are listed
with their evidence rather than left as vague residual risk.

## Method

- Static classification of all 159 route handlers by exported method, authentication helper,
  schema validation, rate limiting, and client type.
- Manual reading of every route the classifier flagged.
- Mutation testing of the payment signature check and the webhook idempotency guard.
- Bundle inspection of the built client output for secret material.
- `npm audit --omit=dev`.

## Findings by severity

### Critical

None found.

### High

None found.

### Medium

**M1. Structured data injected without the project's own escaping (fixed).**
`app/linkedin-extension/page.tsx` rendered JSON-LD with `JSON.stringify(schema)` while every
other page in the repository applies `.replace(/</g, "\\u003c")`. The schema is built from
page constants, so no user input reached it and it was not exploitable. It is fixed because a
single unescaped sink is the kind of inconsistency that becomes exploitable when someone later
makes the data dynamic.

### Low

**L1. Non constant-time comparison of an approval review token hash.**
`app/api/approvals/[id]/approve/route.ts` compares `hashToken(token) !== review_token_hash`
with `!==`. The timing signal leaks how many leading hex characters of a SHA-256 digest match.
Exploiting it requires finding an input whose digest has a chosen prefix, which is preimage
work. Left as is, recorded so the reasoning is on file rather than assumed.

**L2. Browser-scoped activation deduplication is per tab.**
`sessionStorage` does not span tabs, so a second tab in one visit can emit a second
`activation` event. This is a measurement accuracy limit, not a security issue. It is
documented in `lib/marketing-events.ts` and in `docs/PRODUCTION-VALIDATION-PLAN.md`.

## Controls verified, with evidence

### Authentication and session

- `requireAuthApi` resolves identity from the server session, never from client input.
- Credentials sessions carry a `password_version` that is compared against the database on
  every request. A mismatch, or an absent version, returns 401. This revokes tokens issued
  before version tracking existed.
- The browser extension token is HMAC-signed, compared with `timingSafeEqual`, carries an
  expiry, and re-checks `password_version` on every call.

### Authorization

- The consistent pipeline across the career, match, content, and workspace domains is
  `withAuth` then `requirePlan` then `authorizeRole` then a zod schema then
  `createScopedClient(workspaceId)`.
- A client-supplied `workspaceKey` is not trusted. `resolveWorkspaceId` looks up
  `workspace_members` for the caller and throws `unauthorized_workspace` when there is no
  membership row, which the caller maps to 403.
- `__tests__/workspace-mutation-authorization.test.ts` invokes 21 real route handlers with a
  viewer-role session and asserts an actual 403. It does not mock `lib/server/roles`, so the
  role hierarchy executes for real.
- LinkedIn OAuth re-checks workspace role at callback time, not only at initiation, because
  roles can change while the user is on the consent screen.

### Admin

- Admin identity is an environment allowlist of emails compared against the server session.
  The database `role` column is profile data and grants nothing.
- `auth/update-account` cannot change an email address, so a user cannot move themselves onto
  the admin allowlist.
- Ops routes additionally require an `x-admin-key` header compared with `timingSafeEqual`.

### Webhooks and replay

- Lemon Squeezy signatures are verified with `timingSafeEqual` before any processing.
- The career add-on path is routed on an unverified peek at the event name, then re-verifies
  the signature and asserts the signed body's event name matches the routing decision, so the
  peek cannot steer the handler.
- `claim_payment_webhook_v2` claims atomically with `INSERT ... ON CONFLICT DO NOTHING`, locks
  with `FOR UPDATE`, short-circuits `completed`, reclaims stalled work after 90 seconds, and is
  revoked from `PUBLIC`, `anon`, and `authenticated` with `SET search_path = ''`.
- A unique index on `(provider, order_id)` backs the ledger.
- `__tests__/payment-webhook-replay.test.ts` asserts a redelivered event performs no lookup,
  no fulfilment, and no notification. Mutation testing confirmed both the signature check and
  the duplicate guard are load-bearing.

### OAuth and redirects

- OAuth state is HMAC-signed with a nonce, bound to a cookie, and compared with
  `timingSafeEqual`.
- The callback redirect target is constructed against the request's own origin. No
  user-controlled redirect target was found.

### Injection and content safety

- Every JSON-LD sink escapes `<` after the M1 fix.
- The only other `dangerouslySetInnerHTML` is the GA bootstrap, whose measurement ID is
  validated against `/^G-[A-Z0-9]{6,}$/` before interpolation, and which CSP allows by
  build-time hash rather than by a blanket inline allowance.
- Supabase REST filters interpolate through `encodeURIComponent`.
- `getMonthlyCount` restricts table names to an allowlist rather than accepting a caller value.

### Rate limiting and abuse

- Signup, forgot-password, and resend-verification are limited per IP per hour and fall back
  to a conservative in-memory limiter when Redis is unavailable.
- Password reset and verification resend both return an identical generic response whether or
  not the address exists, preventing enumeration, and both persist only hashed tokens with
  expiry.
- Free tools are IP rate limited and additionally gated by a global spend budget.

### File upload

`free-tools/ats-resume-checker/parse` rate limits, rejects on `content-length` before reading,
enforces a type allowlist, validates magic bytes, caps size, and caps page count.

### Secrets

A grep of the built client output for service-role keys, provider keys, cron secrets, auth
secrets, and JWT-shaped strings returned nothing.

### Dependencies

`npm audit --omit=dev` reports 0 vulnerabilities. The repository pins seven transitive
overrides.

## Not covered by this review

- No live penetration testing was performed.
- Authenticated and payment flows were not exercised against production systems.
- The RLS check reflects the configured database only.
- Third-party provider security posture is out of scope.
