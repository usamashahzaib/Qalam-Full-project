# Qalam Architecture

Migration status: **COMPLETE** (as of 2026-06-15). All 10 architectural sins resolved across 16 modules.

For deeper docs see `architecture/` (audit, target design, migration plan, guardrails, system map).

---

## Layer Rules

| Layer | Rule |
|-------|------|
| **Domain** (`types/`, `lib/errors.ts`) | Zero external imports. Pure types and `Result<T>` pattern only. |
| **Application** (`lib/use-cases/`) | Pure TypeScript. No React, no Next.js, no framework imports. |
| **Infrastructure** (`lib/repositories/`, `lib/server/`) | Server-only. Implements repository ports. No UI imports. |
| **Presentation** (`components/`, `app/(app)/`) | No server imports. Max 300 lines per file. |
| **API Routes** (`app/api/`) | Thin wrappers over use cases. Max 80 lines. No business logic. |

---

## Key Source-of-Truth Files

| File | Owns |
|------|------|
| `lib/pricing.ts` | Single source of truth for all plan definitions, prices, and limits |
| `lib/errors.ts` | `Result<T>` error pattern used across all use cases and API routes |
| `lib/use-cases/` | All business logic (17 use cases, one file each) |
| `lib/repositories/interfaces.ts` | Data access contracts (IPostRepository, IVoiceProfileRepository, etc.) |
| `lib/repositories/supabase/` | Supabase implementations of repository interfaces |
| `lib/domain/services/authorization.ts` | Central authorization service |
| `lib/api/client.ts` | Typed client-side API wrapper |

---

## Plan Tiers

| Tier | Price |
|------|-------|
| Free | PKR 0 / forever |
| Solo | PKR 499 / mo |
| Pro | PKR 1,490 / mo |
| Agency | PKR 7,490 / mo |

Limits and feature gates are enforced exclusively via `PLAN_CONFIG` in `lib/pricing.ts`. Never hardcode plan limits elsewhere.

---

## Dependency Direction

```
Presentation
    |
    v
Application (use-cases)
    |
    v
Domain (types, errors)
    ^
    |
Infrastructure (repositories, server)
```

Arrows point inward only. Infrastructure implements Domain interfaces; it never exports to Application or Presentation.
