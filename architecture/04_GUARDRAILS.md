# Phase 4 — Guardrails

> Making backsliding impossible through linting, CI checks, ADRs, and a clear contribution decision tree.

---

## 1. Import Boundary Rules (ESLint)

Install `eslint-plugin-boundaries`:
```bash
npm install --save-dev eslint-plugin-boundaries
```

Add to `eslint.config.mjs`:

```javascript
import boundaries from "eslint-plugin-boundaries"

export default [
  // ... existing config ...
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "domain",         pattern: ["types/*", "lib/pricing.ts", "lib/entitlements.ts", "lib/validation.ts", "lib/constants.ts", "lib/errors.ts"] },
        { type: "application",   pattern: ["lib/use-cases/*", "lib/hooks/*"] },
        { type: "infrastructure", pattern: ["lib/server/*", "lib/api/*"] },
        { type: "presentation",  pattern: ["app/**/*.tsx", "app/**/*.ts", "components/**/*"] },
        { type: "api-routes",    pattern: ["app/api/**/*"] },
      ],
    },
    rules: {
      "boundaries/element-types": ["error", {
        default: "disallow",
        rules: [
          // Domain: zero deps
          { from: "domain",        allow: [] },
          // Application: depends on domain only (no React, no infra)
          { from: "application",   allow: ["domain"] },
          // Infrastructure: depends on domain + application (for ports)
          { from: "infrastructure", allow: ["domain", "application"] },
          // API routes: depends on all server-side layers
          { from: "api-routes",    allow: ["domain", "application", "infrastructure"] },
          // Presentation: depends on domain + application hooks only (NOT infrastructure)
          { from: "presentation",  allow: ["domain", "application"] },
        ],
      }],
    },
  },
]
```

**Critical rule:** `presentation` cannot import from `infrastructure` (no server code in components).

**Run locally:** `npx eslint . --rule 'boundaries/element-types: error'`

---

## 2. TypeScript Path Restrictions

Add path mapping restrictions to `tsconfig.json` — prevent server-only code in client bundles:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/server/*": ["./lib/server/*"]
    }
  }
}
```

In `next.config.ts`, enable the built-in server-only guard:
```typescript
// next.config.ts (add to existing config)
experimental: {
  serverComponentsExternalPackages: [],
  // This makes Next.js throw if "server-only" is imported in client components
}
```

In every file under `lib/server/`:
```typescript
import "server-only"  // Add this as first line to all lib/server/*.ts files
```

This causes a build error if any component tries to import from `lib/server/`.

---

## 3. CI Checks

Add to `.github/workflows/ci.yml` (or create if not exists):

```yaml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
        name: ESLint (includes boundary checks)
      - run: npx tsc --noEmit
        name: TypeScript strict check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test:unit
        name: Vitest unit tests

  architecture-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci

      # Check no server-only code in components
      - name: No lib/server imports in components
        run: |
          if grep -r "from.*lib/server" components/ app/\(app\)/*.tsx --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "api/"; then
            echo "FAIL: Server code imported in client components"
            exit 1
          fi
          echo "PASS: No server imports in client code"

      # Check no inline type definitions in page components
      - name: No inline type definitions in pages
        run: |
          COUNT=$(grep -r "^type \|^interface " app/\(app\)/ --include="*.tsx" | wc -l)
          if [ "$COUNT" -gt 5 ]; then
            echo "FAIL: $COUNT inline type definitions found in pages (max 5 allowed)"
            grep -r "^type \|^interface " app/\(app\)/ --include="*.tsx"
            exit 1
          fi
          echo "PASS: $COUNT inline types in pages (within limit)"

      # Check no files exceed 500 lines in presentation layer
      - name: Page components line count check
        run: |
          VIOLATIONS=$(find app/\(app\) components -name "*.tsx" | xargs wc -l 2>/dev/null | awk '$1 > 500 {print $0}' | grep -v total)
          if [ -n "$VIOLATIONS" ]; then
            echo "FAIL: Components exceeding 500 lines:"
            echo "$VIOLATIONS"
            exit 1
          fi
          echo "PASS: All page components within 500 line limit"

      # Check all API routes have logging
      - name: API routes must use structured logging
        run: |
          MISSING=$(find app/api -name "route.ts" | xargs grep -L "log\." 2>/dev/null)
          if [ -n "$MISSING" ]; then
            echo "FAIL: Routes missing structured logging:"
            echo "$MISSING"
            exit 1
          fi
          echo "PASS: All routes have structured logging"

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
        env:
          # Test env vars — use test Supabase project
          NEXTAUTH_SECRET: ${{ secrets.TEST_NEXTAUTH_SECRET }}
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
```

---

## 4. Pre-commit Hook (Husky)

```bash
npm install --save-dev husky
npx husky init
```

`.husky/pre-commit`:
```bash
#!/bin/sh
# Quick checks before every commit

# Run linting on staged files only (fast)
npx lint-staged

# TypeScript check
npx tsc --noEmit --incremental

echo "Pre-commit checks passed."
```

`package.json` — add lint-staged config:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

## 5. Architecture Decision Records

### Template

```markdown
# ADR-NNN: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Deciders:** [names]

## Context
[What situation forced this decision?]

## Decision
[What was decided?]

## Consequences
**Positive:** ...
**Negative:** ...
**Neutral:** ...

## Alternatives Considered
- Option A: [why rejected]
- Option B: [why rejected]
```

---

### ADR-001: Use Next.js App Router (not Pages Router)

**Date:** 2024-01-01 (inferred from codebase)
**Status:** Accepted

**Context:** Next.js 13+ introduced the App Router. This project targets Next.js 16.

**Decision:** Use App Router exclusively. No `pages/` directory.

**Consequences:**
- Positive: React Server Components reduce client JS bundle; streaming; nested layouts.
- Negative: Some third-party libraries (e.g., NextAuth v5-beta) are still stabilizing for App Router.
- Neutral: Must use `"use client"` directive on interactive components.

---

### ADR-002: No ORM — Supabase REST API Directly

**Date:** 2024-06-01 (inferred)
**Status:** Accepted (to be revisited — see AP-07 in audit)

**Context:** The team chose Supabase as the database. Supabase provides a REST API via PostgREST.

**Decision:** Use `supabase-rest.ts` wrapper (raw REST) rather than Prisma or Drizzle ORM.

**Consequences:**
- Positive: Fewer dependencies; simpler setup; leverages Supabase's built-in RLS directly.
- Negative: No compile-time column-name safety; typos in filter strings silently return empty results; schema refactoring is dangerous.
- Neutral: RPCs still work for complex multi-step operations.

**Migration path:** When team size exceeds 3 developers, migrate to Drizzle ORM for type-safe queries. Drizzle supports Supabase out of the box.

---

### ADR-003: JWT Strategy for Sessions (not DB Sessions)

**Date:** 2024-06-01 (inferred)
**Status:** Accepted

**Context:** Need to choose between database sessions (NextAuth's default) and JWT sessions.

**Decision:** Use JWT sessions (encoded in cookie, no DB session table).

**Consequences:**
- Positive: Stateless; no session table to query on every API call; horizontally scalable.
- Negative: Cannot instantly revoke sessions; token TTL must be short (set to 30 days — borderline too long).
- Neutral: Plan/entitlement changes don't take effect until next login (mitigation: admin overrides are fetched per-request, not from token).

**Rule:** Never store plan or feature flags in the JWT. Always fetch from DB per request so overrides work immediately.

---

### ADR-004: Result<T,E> Over Exceptions Across Layer Boundaries

**Date:** 2026-06-14
**Status:** Accepted

**Context:** The existing codebase passes errors as thrown exceptions, leading to inconsistent error handling and leaked error messages in API responses (see AP-08 in audit).

**Decision:** Adopt `Result<T, QalamError>` return type for all use-case functions. Exceptions are only allowed in infrastructure adapters; they are caught and converted to `Result.err()` before crossing into the application layer.

**Consequences:**
- Positive: Explicit error handling; no forgotten `catch` blocks; type-safe error codes; safe user messages separate from internal messages.
- Negative: Slightly more verbose function signatures; team must learn the pattern.
- Neutral: API routes remain the only place that converts `QalamError` to HTTP status codes.

**Rule:** `throw` is banned in `lib/use-cases/*.ts`. Use `return err({ code, message })`.

---

### ADR-005: Context Slicing — Three Focused Contexts Over One God Context

**Date:** 2026-06-14
**Status:** Proposed (target state post-migration Step 9)

**Context:** `WorkspaceProvider.tsx` (491 lines) holds all app state in one context with 15 mutation methods. Every mutation triggers a re-render of the entire app tree.

**Decision:** Split into `PostsContext`, `ProfileContext`, and `AgencyContext`. Maintain the `useWorkspace()` hook as a composed shortcut for backward compatibility during migration.

**Consequences:**
- Positive: Isolated re-renders per domain; independently testable; each context has one reason to change.
- Negative: Three contexts to maintain; shallow merge in `useWorkspace()` must be kept in sync.
- Neutral: Migration is incremental via Step 9 in `03_MIGRATION_PLAN.md`.

**Rule:** No context may hold state from more than one domain slice. If a context grows beyond 200 lines, split it.

---

## 6. `CONTRIBUTING.md` Decision Tree — "Where Does This Code Go?"

Add this section to `CONTRIBUTING.md` (or create the file if absent):

---

### Where Does This Code Go?

When you write a new piece of code, ask these questions in order:

```
1. Does it describe a shape or constraint of the business domain?
   (Post status values, WriterRole enum, plan names, feature flags)
   → types/domain.ts or types/{feature}.ts

2. Does it express a pure business rule with no external dependencies?
   (canAccessPlan, isValidLinkedInUrl, PLAN_LIMITS, WRITER_ROLES constant)
   → lib/pricing.ts, lib/entitlements.ts, lib/validation.ts, or lib/constants.ts

3. Does it orchestrate a user-facing action (checking limits, calling AI, saving to DB)?
   (generate-post, save-draft, run-approval, train-voice)
   → lib/use-cases/{action}.ts
   ↳ Must accept injected ports. Must return Result<T, QalamError>. No React. No Next.js.

4. Does it manage React state for a UI feature?
   (writer content + role + format state, form inputs, calendar selection)
   → lib/hooks/use{Feature}State.ts or use{Feature}Logic.ts
   ↳ May call API routes via fetch(). May call use-cases via ports. No direct Supabase.

5. Does it call Supabase, Groq, LinkedIn, Redis, Resend, or any external service?
   → lib/server/{adapter}.ts
   ↳ Must be server-only (add `import "server-only"` at top).
   ↳ Must implement a port interface from lib/use-cases/ports.ts.

6. Does it handle an HTTP request or response?
   → app/api/{resource}/route.ts
   ↳ Must be thin: parse → auth → call use-case → serialize. Max 80 lines.
   ↳ Must import from use-cases, not from lib/server/ directly.

7. Does it render UI?
   → app/(app)/{feature}/page.tsx or components/{Feature}.tsx
   ↳ Must NOT import from lib/server/*.
   ↳ Must NOT contain business logic (extract to hooks or use-cases).
   ↳ Max 300 lines per file. If larger, split into sub-components.
```

### Anti-Pattern Checklist (mandatory PR review gate)

Before requesting a review, check:

- [ ] No `import from "@/lib/server/*"` in any `.tsx` component file
- [ ] No type definitions (`type Foo =` or `interface Foo`) in page components (use `types/`)
- [ ] No hardcoded arrays (content, options, enums) in components (use `lib/constants.ts` or `lib/marketing-content.ts`)
- [ ] No `useState` count exceeding 10 in a single component (extract to a hook)
- [ ] New API routes ≤ 80 lines
- [ ] New use-case functions return `Result<T, QalamError>` (no `throw` across boundaries)
- [ ] Any new `lib/server/*.ts` file has `import "server-only"` as its first line

---

## 7. Test Pyramid Enforcement

Add to `package.json`:
```json
{
  "scripts": {
    "test:unit": "vitest run --reporter=verbose",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:coverage:check": "vitest run --coverage --coverage.thresholds.lines=80"
  }
}
```

Add `vitest.config.ts` coverage thresholds:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
      include: ["lib/use-cases/**", "lib/pricing.ts", "lib/entitlements.ts", "lib/validation.ts"],
      exclude: ["lib/server/**", "app/**", "components/**"],  // infrastructure/presentation not unit-tested
    },
  },
})
```

Coverage targets only enforce on the domain and application layers (pure, testable). Infrastructure and presentation are validated by integration/E2E tests.

---

## 8. PR Review Checklist (add to `.github/pull_request_template.md`)

```markdown
## Architectural Checklist

### Layer compliance
- [ ] No `lib/server` imports in client components
- [ ] No `throw` in use-case functions (use `Result<T, QalamError>`)
- [ ] New business logic lives in `lib/use-cases/` or `lib/hooks/`, not in page components

### Size discipline
- [ ] No new files exceed 300 lines (use-cases), 200 lines (hooks), 500 lines (components)
- [ ] If a component grew, has a split been considered?

### Types
- [ ] No new inline type definitions in page components
- [ ] New domain types added to `types/`

### Constants
- [ ] No new hardcoded content arrays in components
- [ ] New constants live in `lib/constants.ts` or `lib/marketing-content.ts`

### Logging
- [ ] New API routes include `log.info(...)` on success and `log.error(...)` on failure

### Tests
- [ ] New use-case functions have at least one unit test with mocked ports
- [ ] E2E test covers the critical user journey if a feature is added/changed
```
