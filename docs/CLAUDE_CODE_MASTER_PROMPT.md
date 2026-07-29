# Claude Code Master Execution Prompt

You are working inside the Qalam production repository. Your job is to repair and verify the platform foundation without changing approved positioning, UX, visual design, pricing, or product scope.

## Ownership

- Product positioning, information architecture, UX, design, public copy, pricing, and acceptance criteria are owned by the lead product and design agent.
- You own backend implementation, schema consolidation, migrations, authorization, integration reliability, and automated tests.
- Do not redesign screens, rename product concepts, invent pricing, rewrite marketing copy, or add unrequested features.
- If a required decision is missing, stop and report the exact decision needed. Never guess.

## Read Before Editing

Read completely:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `DESIGN.md`
4. `SYSTEM_ARCHITECTURE.md`
5. `package.json`
6. Every file under `supabase/migrations`
7. `supabase/MIGRATIONS.md`
8. `auth.ts`
9. `lib/server/workspace.ts`
10. `lib/server/auth.ts`
11. `lib/server/roles.ts`
12. `lib/server/linkedin.ts`
13. `lib/server/linkedin-credentials.ts`
14. Every route under `app/api/linkedin`
15. Every route under `app/api/career`
16. `app/api/posts/route.ts`
17. `app/api/generate/route.ts`
18. `components/providers/WorkspaceProvider.tsx`
19. `app/(app)/writer/page.tsx`

Read the installed Next.js 16 documentation in `node_modules/next/dist/docs` before framework changes. Verify Supabase and LinkedIn behavior against official current documentation.

## Non-Negotiable Rules

1. Start with a read-only evidence report mapping tables, columns, RPCs, identifiers, payloads, side effects, and authorization boundaries.
2. Define one canonical target schema before migrations.
3. Use one internal UUID for database authorization. Treat LinkedIn and NextAuth IDs only as external identities.
4. Never weaken tenant checks to pass tests.
5. Never expose service keys, OAuth secrets, tokens, codes, email addresses, resumes, or user content in logs or responses.
6. Every public-schema table needs an explicit access decision and correct RLS.
7. Service-role routes still require application-level tenant authorization.
8. All external side effects must be idempotent.
9. OAuth state must be random, HttpOnly, short-lived, SameSite protected, single-use, validated, then deleted.
10. Cron routes must reject requests when `CRON_SECRET` is missing. `Bearer undefined` must never authenticate.
11. Preserve unrelated dirty files. Never use destructive Git commands.
12. Use forward migrations. Do not edit production data manually.
13. Do not use em dashes or en dashes.

## Phase 1: Schema and Identity

- Treat `supabase/migrations` as canonical. Legacy SQL is audit-only.
- Produce a compatibility matrix for users, workspaces, memberships, posts, versions, publishing accounts, publish attempts, voice profiles, usage, subscriptions, events, jobs, approvals, career vault records, resumes, job matches, cohorts, and add-ons.
- Resolve duplicate or conflicting migration versions safely.
- Add missing constraints, foreign keys, unique keys, timestamps, tenant indexes, and RLS.
- Preserve existing data.
- Normalize external identities to one internal user UUID.
- Add negative tests proving cross-workspace access is denied.

## Phase 2: LinkedIn OAuth

- Replace partial flows with one complete connect, callback, status, reconnect, and disconnect lifecycle.
- Validate state and exchange authorization codes server-side.
- Request only approved scopes, including `w_member_social` for publishing.
- Resolve the authenticated member ID.
- Store tokens server-side against the correct workspace publishing account.
- Derive connected state only from token presence, member ID, scopes, and expiry.
- Never infer publishing connection from email or login session.

## Phase 3: Writer and Quality Contract

- Define one versioned Zod request and response contract for Writer and `/api/generate`.
- Support generation, repair, CTA rewrite, hook improvement, and replies through explicit modes.
- Return stable JSON errors.
- Score generated content server-side.
- If score is below 82, rewrite and rescore with a bounded retry count.
- Persist final text and final score together.
- Manual edits invalidate the previous score.
- Publishing requires a current score of at least 82 unless an explicit audited override exists.
- Test 81, 82, missing score, stale score, and failed rescoring.

## Phase 4: Publishing and Scheduling

- Create a publish-attempt or outbox row before calling LinkedIn.
- Use an idempotency key tied to workspace, post, content version, and action.
- Persist sanitized provider results.
- Reconcile safely if LinkedIn succeeds but the database update fails.
- Claim scheduled work with database locking so two workers cannot publish the same post.
- Never convert integration failures into zero analytics.

## Phase 5: Career Engine

- Verify every Career Vault, audit, resume, JD match, recruiter visibility, cohort, and add-on endpoint against schema and entitlements.
- Keep supplied facts separate from AI wording.
- Never invent dates, employers, qualifications, achievements, metrics, or ATS certainty.
- Make one resume per dedicated JD consume the correct monthly allowance or add-on credit exactly once.
- Make add-on checkout quantity, price, credit issuance, consumption, and billing history reconcile.
- Verify Free gets only the approved free allowance.
- Add cross-workspace, duplicate-consumption, invalid-file, and stale-version tests.

## Required Verification

Add or repair automated coverage for:

- LinkedIn URL normalization
- OAuth success, mismatch, replay, cancellation, expiry, and token failure
- Connected, expired, missing-scope, and disconnected states
- Cross-workspace authorization denial
- Writer request and response contracts
- Score 82 and stale-score invalidation
- Publish idempotency
- Scheduled claim and retry
- Cron missing-secret rejection
- RLS and tenant isolation
- Career Vault fact integrity
- Resume and JD entitlement consumption
- Add-on payment and credit reconciliation
- Pricing and backend entitlement parity

Run:

- `npm run check:dashes`
- `npm run check:rls`
- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- dependency audit
- migration validation
- Supabase security and performance advisors when available

Do not report success if a required command fails. Separate pre-existing failures from regressions with evidence.

## Definition of Done

- LinkedIn connect creates a verified server-side publishing account.
- UI connected state comes only from verified server state.
- A post can be generated, saved, rescored, published once, and reconciled.
- Scheduled posts cannot run early or twice.
- CRUD uses one tenant-safe internal identity.
- Schema, types, APIs, migrations, and entitlements agree.
- Score 82 is enforced server-side.
- Career facts remain traceable and unchanged across tailored outputs.
- Add-on credits reconcile exactly.
- Failure-path tests exist.
- Dash check, RLS check, lint, typecheck, tests, and build pass.

## Report Format

For each phase report:

1. Evidence found
2. Files changed
3. Data impact
4. Security impact
5. Tests added
6. Commands and exact result
7. Remaining risks

If blocked, state the exact missing credential, product decision, database state, or external approval. Never fabricate completion.
