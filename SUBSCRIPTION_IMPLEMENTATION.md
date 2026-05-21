# Subscription System Implementation

## Architecture

Two-layer enforcement:

1. **Frontend (UX)** — `PlanGate` component and `usePlan` hook. Hides locked features in the UI. Readable from client; not a security control.
2. **Backend (Security)** — `requirePlan()` middleware in `lib/server/require-plan.ts`. All plan-gated API routes enforce this server-side. Cannot be bypassed from the client.

The plan source of truth is `organizations.plan` in Supabase, fetched via `fetchWorkspacePlan()`. The value in localStorage is a UX cache only — it is always overridden by the server response from `/api/workspace`.

## Plan Hierarchy

| Plan           | Tier |
|----------------|------|
| Free           | 0    |
| Solo           | 1    |
| Pro            | 2    |
| Agency Starter | 3    |
| Agency Growth  | 4    |

Plans are cumulative — a higher tier includes all features of lower tiers.

## Files

| File | Role |
|------|------|
| `lib/entitlements.ts` | Plan definitions, limits, `canAccessPlan`, `PLAN_HIERARCHY` |
| `lib/server/require-plan.ts` | `requirePlan()` middleware, `enforceMonthlyLimit`, `getMonthlyCount` |
| `lib/server/app-session.ts` | `fetchWorkspacePlan`, `validateSessionVersion`, `incrementSessionVersion` |
| `lib/hooks/usePlan.ts` | Client hook for plan-aware UI |
| `components/PlanGate.tsx` | Full-page lock component for restricted routes |
| `components/AppShell.tsx` | Nav lock icons on restricted links |
| `supabase/migrations/0004_subscription_system.sql` | DB migration — adds plan columns, audit log, session_version |

## API Routes with Plan Enforcement

| Route | Required Plan | Limit Type |
|-------|--------------|------------|
| `POST /api/generate` | Free | Monthly draft count |
| `POST /api/carousel` | Solo | Monthly carousel count |
| `POST /api/competitors/analyze` | Pro | Monthly research runs |

## Updating a User's Plan

1. Update `organizations.plan` in Supabase (via admin panel or manual SQL).
2. The `trg_plan_change` trigger auto-writes to `plan_audit_log` and updates `plan_updated_at`.
3. To force immediate session invalidation (e.g., on downgrade): call `incrementSessionVersion(email)`.
4. On the next API call, `validateSessionVersion` detects the stale token and returns `401 session_invalidated`. The client should redirect to `/auth`.

## Monthly Limit Counting

`getMonthlyCount(table, workspaceId)` counts rows in the given table since the first of the current calendar month. This runs once per request on limit-checked routes. The count is not cached.

## Session Version

`session_version` is embedded in the JWT at login time. On every `requirePlan()` call, the DB value is compared to the token value. If the DB version is higher, the session is rejected. Use `incrementSessionVersion(email)` to immediately invalidate all active sessions for a user.
