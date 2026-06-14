# Phase 3 — Migration Playbook

> **Strategy:** Strangler Fig. Every step ships to production independently. App never breaks. Business logic gradually migrates inward.
>
> **Rules for every step:**
> - Work on a feature branch; merge via PR after code review + staging deploy
> - No step may touch `main` directly
> - App must pass existing Playwright E2E suite before merge
> - Estimated downtime: **zero** (all changes are additive until old code is deleted)
> - Each step targets a specific "Architectural Sin" from the audit (`01_AUDIT.md §9`)

---

## Reading Guide

Each migration step has:
- **Branch name** — create this branch from `main`
- **Kills** — which Architectural Sin(s) from Phase 1 it eliminates
- **Files touched** — exact paths
- **What changes** — pseudo-diff describing the transformation
- **Rollback** — what to do if the step must be reverted
- **Estimated effort** — developer-hours for one mid-level developer
- **Downtime** — always zero unless noted

---

## Step 0 — Foundation: Error + Result Types

**Branch:** `arch/00-errors-result-type`
**Kills:** AP-08 (no structured errors), sets foundation for all future steps
**Effort:** 2h
**Downtime:** Zero

**Files touched:**
```
lib/errors.ts                    ← NEW
```

**What changes:**

Create `lib/errors.ts`:
```typescript
export type QalamErrorCode =
  | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND"
  | "PLAN_LIMIT_EXCEEDED" | "VALIDATION_ERROR"
  | "AI_UNAVAILABLE" | "LINKEDIN_ERROR"
  | "PAYMENT_ERROR" | "INTERNAL_ERROR"

export interface QalamError {
  code: QalamErrorCode
  message: string       // internal; safe to log
  userMessage?: string  // safe to show in UI
  cause?: unknown
}

export type Result<T, E = QalamError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = (error: QalamError): Result<never, QalamError> => ({ ok: false, error })

export function errorToStatus(code: QalamErrorCode): number {
  const map: Record<QalamErrorCode, number> = {
    UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
    PLAN_LIMIT_EXCEEDED: 429, VALIDATION_ERROR: 400,
    AI_UNAVAILABLE: 503, LINKEDIN_ERROR: 502,
    PAYMENT_ERROR: 400, INTERNAL_ERROR: 500,
  }
  return map[code]
}
```

No existing code changes. Pure addition.

**Tests to add:**
```typescript
// __tests__/errors.test.ts
import { ok, err, errorToStatus } from "@/lib/errors"
test("ok wraps value", () => expect(ok(42)).toEqual({ ok: true, data: 42 }))
test("err wraps error", () => expect(err({ code: "NOT_FOUND", message: "x" }).ok).toBe(false))
test("errorToStatus maps correctly", () => expect(errorToStatus("NOT_FOUND")).toBe(404))
```

**Rollback:** Delete `lib/errors.ts`. Nothing else references it yet.

---

## Step 1 — Foundation: Structured Logging

**Branch:** `arch/01-structured-logging`
**Kills:** AP-08 (no request logging)
**Effort:** 3h
**Downtime:** Zero

**Files touched:**
```
lib/server/logging.ts            ← NEW
app/api/generate/route.ts        ← MODIFY (add log calls)
app/api/posts/route.ts           ← MODIFY (add log calls)
```

**What changes:**

Create `lib/server/logging.ts`:
```typescript
const level = process.env.LOG_LEVEL ?? "info"

function write(lvl: string, event: string, ctx: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test") return
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: lvl, event, ...ctx }))
}

export const log = {
  info:  (event: string, ctx: Record<string, unknown> = {}) => write("info", event, ctx),
  warn:  (event: string, ctx: Record<string, unknown> = {}) => write("warn", event, ctx),
  error: (event: string, ctx: Record<string, unknown> = {}) => write("error", event, ctx),
}
```

Add to `app/api/generate/route.ts` — wrap existing try/catch:
```typescript
// BEFORE (pseudo-diff — )
try {
  const auth = await requireAuthApi(req)
  // ... existing code ...
  return NextResponse.json(result)
} catch (error) {
  return NextResponse.json({ error: (error as Error).message }, { status: 500 })
}

// AFTER
import { log } from "@/lib/server/logging"
const reqId = crypto.randomUUID()
try {
  log.info("generate.start", { reqId })
  const auth = await requireAuthApi(req)
  // ... existing code unchanged ...
  log.info("generate.done", { reqId })
  return NextResponse.json(result)
} catch (error) {
  log.error("generate.unhandled", { reqId, error: (error as Error).message })
  return NextResponse.json({ error: "Internal error" }, { status: 500 })
}
```

Apply same pattern to `app/api/posts/route.ts`. Roll out to all 81 routes gradually (can be done across multiple PRs — this step does the 2 highest-traffic ones).

**Rollback:** Remove log calls and delete `lib/server/logging.ts`. Zero user impact.

---

## Step 2 — Domain Types Extraction

**Branch:** `arch/02-domain-types`
**Kills:** AP-04 (domain types in UI), AP-05 (partial)
**Effort:** 4h
**Downtime:** Zero

**Files touched:**
```
types/writer.ts                         ← NEW
types/admin.ts                          ← NEW
types/domain.ts                         ← EXPAND (add CalendarEvent, DraftVersion)
app/(app)/writer/page.tsx               ← MODIFY (import from types/writer.ts)
app/admin/AdminDashboard.tsx            ← MODIFY (import from types/admin.ts)
app/(app)/dashboard/DashboardClient.tsx ← MODIFY (import from types/domain.ts)
```

**What changes:**

1. Create `types/writer.ts` — copy types from `writer/page.tsx` lines ~12–78:
```typescript
export type WriterRole = "CEO" | "HR" | "Marketing" | "Sales" | "Founder"
  | "Designer" | "Engineer" | "Consultant" | "Coach" | "Recruiter"
  | "Investor" | "Author" | "Educator" | "Finance"

export type PostFormat = "Short" | "Medium" | "Long" | "Carousel"
export type HookStyle = "SHARP" | "AUTHORITY" | "STORY" | "DATA"

export interface ScoreBreakdown { overall: number; hooks: number; cta: number; readability: number; tips: string[] }
export interface DraftVersion { content: string; timestamp: string; role: WriterRole }
export interface GeneratedHook { style: HookStyle; text: string }
```

2. In `app/(app)/writer/page.tsx`:
   - Delete the inline type definitions
   - Add: `import type { WriterRole, PostFormat, HookStyle, ScoreBreakdown, DraftVersion } from "@/types/writer"`

3. Create `types/admin.ts`:
```typescript
export interface AdminUser { id: string; email: string; name: string; plan: string; createdAt: string }
export interface AdminOverride { plan_override?: string; draft_limit_override?: number; feature_flags?: Record<string, boolean>; expires_at?: string }
export interface AuditLogEntry { admin_email: string; target_user_email: string; action: string; old_value?: string; new_value?: string; created_at: string }
```

4. In `app/admin/AdminDashboard.tsx`:
   - Delete inline type definitions
   - Import from `types/admin.ts`

**All runtime behavior is identical.** Types are erased at runtime.

**Rollback:** Revert imports in the two component files. Types in `types/` stay — harmless.

---

## Step 3 — Constants & Validation Extraction

**Branch:** `arch/03-constants-validation`
**Kills:** AP-05 (hardcoded config in components)
**Effort:** 3h
**Downtime:** Zero

**Files touched:**
```
lib/constants.ts           ← NEW
lib/validation.ts          ← NEW
app/page.tsx               ← MODIFY (import NICHES, FEATURES from lib/marketing-content)
app/(app)/settings/page.tsx ← MODIFY (import INDUSTRY_OPTIONS, ACCOUNT_ROLES from lib/constants)
lib/marketing-content.ts   ← EXPAND (add NICHES, FEATURES arrays)
```

**What changes:**

Create `lib/constants.ts`:
```typescript
export const WRITER_ROLES = ["CEO", "HR", "Marketing", "Sales", "Founder",
  "Designer", "Engineer", "Consultant", "Coach", "Recruiter",
  "Investor", "Author", "Educator", "Finance"] as const

export const POST_FORMATS = ["Short", "Medium", "Long", "Carousel"] as const

export const HOOK_STYLES = ["SHARP", "AUTHORITY", "STORY", "DATA"] as const

export const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Healthcare", "Education", "Marketing",
  "Consulting", "Legal", "Real Estate", "Retail", "Manufacturing",
  "Media", "Non-Profit", "Government", "Other"
] as const

export const ACCOUNT_ROLES = ["Founder", "Executive", "Manager", "Individual Contributor", "Consultant", "Other"] as const
```

Create `lib/validation.ts`:
```typescript
export function isValidLinkedInUrl(value: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[\w-]+\/?$/.test(value.trim())
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
```

In `lib/marketing-content.ts` — add:
```typescript
export const NICHES = ["Founders", "HR Directors", ...] as const  // move 84 items here
export const FEATURES = [...] as const  // move 20+ items here
```

In `app/page.tsx` — replace inline arrays with imports.
In `app/(app)/settings/page.tsx` — replace inline arrays with imports.

**Rollback:** Keep imports; if needed, inline the arrays again in components. Zero behavior change.

---

## Step 4 — Extract Writer Custom Hooks

**Branch:** `arch/04-writer-hooks`
**Kills:** AP-01 (business logic in UI), AP-10 (manual fetch + setState)
**Effort:** 1 day (8h)
**Downtime:** Zero

**Files touched:**
```
lib/hooks/useWriterState.ts       ← NEW
lib/hooks/usePostGeneration.ts    ← NEW
app/(app)/writer/page.tsx         ← MODIFY (use new hooks)
```

**What changes:**

Extract all writer state and mutations from `writer/page.tsx` into two hooks.

Create `lib/hooks/useWriterState.ts`:
```typescript
import { useState, useCallback } from "react"
import type { WriterRole, PostFormat, DraftVersion } from "@/types/writer"

export function useWriterState() {
  const [content, setContent] = useState("")
  const [role, setRole] = useState<WriterRole>("Founder")
  const [format, setFormat] = useState<PostFormat>("Medium")
  const [versions, setVersions] = useState<DraftVersion[]>([])
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  const saveVersion = useCallback((c: string, r: WriterRole) => {
    setVersions(prev => [{ content: c, timestamp: new Date().toISOString(), role: r }, ...prev.slice(0, 9)])
  }, [])

  const restoreVersion = useCallback((v: DraftVersion) => {
    setContent(v.content)
    setRole(v.role)
  }, [])

  return { content, setContent, role, setRole, format, setFormat,
           versions, saveVersion, restoreVersion, scheduledAt, setScheduledAt }
}
```

Create `lib/hooks/usePostGeneration.ts`:
```typescript
import { useState, useCallback } from "react"
import type { ScoreBreakdown, HookStyle, GeneratedHook } from "@/types/writer"
import type { WriterRole, PostFormat } from "@/types/writer"

export function usePostGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [score, setScore] = useState<ScoreBreakdown | null>(null)
  const [hooks, setHooks] = useState<GeneratedHook[]>([])
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (params: {
    topic: string; role: WriterRole; format: PostFormat; workspaceId: string
  }) => {
    setIsGenerating(true); setError(null)
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return null }
      setScore(data.score)
      return data.content as string
    } catch { setError("Generation failed"); return null }
    finally { setIsGenerating(false) }
  }, [])

  const generateHooks = useCallback(async (content: string, style: HookStyle) => {
    const res = await fetch("/api/generate/hooks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, style }),
    })
    const data = await res.json()
    setHooks(data.hooks ?? [])
  }, [])

  return { isGenerating, score, hooks, error, generate, generateHooks }
}
```

In `app/(app)/writer/page.tsx`:
- Remove the 50+ useState declarations that are now in hooks
- Import and destructure `useWriterState()` and `usePostGeneration()`
- Component shrinks from 1544 lines to ~400 lines (UI + composition)

**Key validation:** After this step, `app/(app)/writer/page.tsx` line count should drop below 500. Run Playwright writer flow tests.

**Rollback:** Move hook logic back inline. Since hooks are purely extracting existing logic, behavior is identical.

---

## Step 5 — Split Writer Page into Sub-Components

**Branch:** `arch/05-writer-split`
**Kills:** AP-01 (continued), reduces cyclomatic complexity
**Effort:** 1 day (8h)
**Downtime:** Zero

**Files touched:**
```
app/(app)/writer/page.tsx            ← MODIFY (reduce to ~100 lines)
app/(app)/writer/WriterEditor.tsx    ← NEW (~150 lines)
app/(app)/writer/WriterHooks.tsx     ← NEW (~120 lines)
app/(app)/writer/WriterScoring.tsx   ← NEW (~100 lines)
app/(app)/writer/WriterVersions.tsx  ← NEW (~80 lines)
app/(app)/writer/WriterScheduler.tsx ← NEW (~100 lines)
```

**What changes:**

`writer/page.tsx` becomes a composition shell:
```tsx
import { WriterEditor } from "./WriterEditor"
import { WriterHooks } from "./WriterHooks"
import { WriterScoring } from "./WriterScoring"
import { WriterVersions } from "./WriterVersions"
import { WriterScheduler } from "./WriterScheduler"
import { useWriterState } from "@/lib/hooks/useWriterState"
import { usePostGeneration } from "@/lib/hooks/usePostGeneration"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

export default function WriterPage() {
  const writerState = useWriterState()
  const generation = usePostGeneration()
  const { workspaceId, billing } = useWorkspace()

  return (
    <div className="...">
      <WriterEditor state={writerState} generation={generation} workspaceId={workspaceId} />
      <div className="...">
        <WriterHooks hooks={generation.hooks} onInsert={writerState.setContent} />
        <WriterScoring score={generation.score} onRetry={() => generation.generate(...)} />
        <WriterVersions versions={writerState.versions} onRestore={writerState.restoreVersion} />
        <WriterScheduler billing={billing} state={writerState} workspaceId={workspaceId} />
      </div>
    </div>
  )
}
```

Each sub-component receives only what it needs via props. No sub-component imports from other sub-components.

**Rollback:** Revert `writer/page.tsx` to pre-split version (git checkout). Delete new files.

---

## Step 6 — Extract Settings Hooks + Split Settings Page

**Branch:** `arch/06-settings-split`
**Kills:** AP-01 (continued — settings/page.tsx 773 lines)
**Effort:** 6h
**Downtime:** Zero

**Files touched:**
```
lib/hooks/useProfileForm.ts           ← NEW
lib/hooks/useBillingInfo.ts           ← NEW
app/(app)/settings/page.tsx           ← MODIFY (reduce to ~80 lines)
app/(app)/settings/ProfilePanel.tsx   ← NEW (~200 lines)
app/(app)/settings/BillingPanel.tsx   ← NEW (~200 lines)
app/(app)/settings/AccountPanel.tsx   ← NEW (~150 lines)
```

**What changes:**

Create `lib/hooks/useProfileForm.ts` — extracts form state + submit logic from `settings/page.tsx:~100–350`:
```typescript
export function useProfileForm(initialProfile: WorkspaceProfile) {
  const [name, setName] = useState(initialProfile.name ?? "")
  const [linkedInUrl, setLinkedInUrl] = useState(initialProfile.linkedInUrl ?? "")
  const [industry, setIndustry] = useState(initialProfile.industry ?? "")
  const [role, setRole] = useState(initialProfile.role ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (): string | null => {
    if (linkedInUrl && !isValidLinkedInUrl(linkedInUrl)) return "Invalid LinkedIn URL"
    return null
  }

  const submit = async () => {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/update-account", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, linkedInUrl, industry, role }),
      })
      if (!res.ok) setError((await res.json()).error)
    } finally { setIsSubmitting(false) }
  }

  return { name, setName, linkedInUrl, setLinkedInUrl, industry, setIndustry, role, setRole, isSubmitting, error, submit }
}
```

`settings/page.tsx` becomes a composition of three panels, similar to writer split.

**Rollback:** Revert `settings/page.tsx` to original. Delete new files.

---

## Step 7 — Extract Dashboard Metrics Hook

**Branch:** `arch/07-dashboard-hook`
**Kills:** AP-01 (DashboardClient 748 lines), AP-10 (manual fetch/setState)
**Effort:** 4h
**Downtime:** Zero

**Files touched:**
```
lib/hooks/useDashboardMetrics.ts              ← NEW
app/(app)/dashboard/DashboardClient.tsx       ← MODIFY (reduce to ~200 lines)
```

**What changes:**

Create `lib/hooks/useDashboardMetrics.ts` — extracts data fetching from `DashboardClient.tsx:~1–200`:
```typescript
export function useDashboardMetrics(workspaceId: string) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [statsRes, postsRes] = await Promise.all([
        fetch(`/api/dashboard/stats?workspaceKey=${workspaceId}`),
        fetch(`/api/dashboard/recent-posts?workspaceKey=${workspaceId}`),
      ])
      const [statsData, postsData] = await Promise.all([statsRes.json(), postsRes.json()])
      setStats(statsData)
      setRecentPosts(postsData.posts ?? [])
      setIsLoading(false)
    }
    load()
  }, [workspaceId])

  return { stats, recentPosts, isLoading }
}
```

`DashboardClient.tsx` becomes a pure rendering component using the hook.

**Rollback:** Move hook logic back inline.

---

## Step 8 — Extract Calendar Hook

**Branch:** `arch/08-calendar-hook`
**Kills:** AP-01 (calendar/page.tsx 645 lines)
**Effort:** 5h
**Downtime:** Zero

**Files touched:**
```
lib/hooks/useCalendarLogic.ts    ← NEW
app/(app)/calendar/page.tsx      ← MODIFY (reduce to ~200 lines)
```

**What changes:**

Create `lib/hooks/useCalendarLogic.ts` — extracts from `calendar/page.tsx`:
- Selected month/date state
- Calendar grid generation (date arithmetic)
- Drag-and-drop rescheduling mutations
- Post filtering by date

`calendar/page.tsx` becomes: hook + rendering. No logic in component.

**Rollback:** Move logic back inline.

---

## Step 9 — Split WorkspaceProvider into Domain Slices

**Branch:** `arch/09-workspace-context-split`
**Kills:** AP-02 (God Context Provider)
**Effort:** 1 day (8h)
**Downtime:** Zero — but HIGH RISK, run full Playwright suite

**Files touched:**
```
components/providers/PostsContext.tsx        ← NEW
components/providers/ProfileContext.tsx      ← NEW
components/providers/AgencyContext.tsx       ← NEW
components/providers/WorkspaceProvider.tsx   ← MODIFY (becomes thin orchestrator)
components/providers/ProtectedAppProviders.tsx ← MODIFY (mount all three contexts)
```

**Strategy — Strangler Fig within the file:**

1. Create `PostsContext.tsx` with the posts slice (posts, drafts, scheduled, published + 4 mutations).
2. Create `ProfileContext.tsx` with profile + billing slice.
3. Create `AgencyContext.tsx` with agency/clients slice.
4. In `WorkspaceProvider.tsx`, replace state + methods with imports from the three contexts.
5. Maintain the same public hook signature `useWorkspace()` so all consumers are unchanged.

```typescript
// components/providers/WorkspaceProvider.tsx (after split)
export function useWorkspace() {
  const posts = useContext(PostsContext)
  const profile = useContext(ProfileContext)
  const agency = useContext(AgencyContext)
  return { ...posts, ...profile, ...agency }  // maintains backward-compatible API
}
```

This means zero changes to any consumer (`writer/page.tsx`, etc.) in this step.

**Rollback:** Revert `WorkspaceProvider.tsx` to pre-split state. Three new files can stay (harmless).

**Validation:** After merge, run all Playwright E2E tests. Monitor for extra re-renders with React DevTools Profiler in staging.

---

## Step 10 — Extract Admin Hook + Types

**Branch:** `arch/10-admin-refactor`
**Kills:** AP-04 (types in UI), AP-01 (AdminDashboard 618 lines)
**Effort:** 4h
**Downtime:** Zero

**Files touched:**
```
lib/hooks/useAdminUsers.ts        ← NEW
app/admin/AdminDashboard.tsx      ← MODIFY (reduce to ~200 lines)
```

Types already moved in Step 2. This step extracts the hook.

---

## Step 11 — Extract Use-Cases: Generate Post

**Branch:** `arch/11-usecase-generate`
**Kills:** AP-01 (business logic in API routes), establishes Application layer
**Effort:** 6h
**Downtime:** Zero

**Files touched:**
```
lib/use-cases/generate-post.ts    ← NEW
app/api/generate/route.ts         ← MODIFY (thin — delegates to use-case)
```

**What changes:**

Move generation orchestration logic from `app/api/generate/route.ts` into `lib/use-cases/generate-post.ts`. The route becomes:
```typescript
// app/api/generate/route.ts (after)
import { generatePost } from "@/lib/use-cases/generate-post"
import { deps } from "@/lib/server/deps"
export async function POST(req: NextRequest) {
  // auth + parse → call use-case → serialize result
}
```

The use-case contains: plan limit check → voice profile fetch → content generation → usage increment → return `Result<GeneratedPost, QalamError>`.

**Tests to add:**
```typescript
// __tests__/use-cases/generate-post.test.ts
import { generatePost } from "@/lib/use-cases/generate-post"
test("returns plan limit error when limit exceeded", async () => {
  const result = await generatePost(input, {
    planLimits: { check: async () => false, increment: async () => {} },
    contentGenerator: { generate: async () => { throw new Error("should not be called") } },
  })
  expect(result.ok).toBe(false)
  expect(result.error.code).toBe("PLAN_LIMIT_EXCEEDED")
})
```

Note: **this test runs in ~10ms with no network, no DB, no React**.

**Rollback:** Move logic back inline into the route.

---

## Step 12 — Extract Use-Cases: Approval Workflow

**Branch:** `arch/12-usecase-approvals`
**Kills:** AP-01 (workflow logic in UI component — `approvals/page.tsx`)
**Effort:** 4h
**Downtime:** Zero

**Files touched:**
```
lib/use-cases/run-approval.ts          ← NEW
app/(app)/approvals/page.tsx           ← MODIFY (use hook, not inline logic)
lib/hooks/useApprovalQueue.ts          ← NEW
app/api/approvals/[id]/approve/route.ts ← MODIFY (thin)
app/api/approvals/[id]/reject/route.ts  ← MODIFY (thin)
```

---

## Step 13 — Split Prompts Monolith

**Branch:** `arch/13-prompts-split`
**Kills:** AP-06 (monolithic 1354-line prompts file)
**Effort:** 4h
**Downtime:** Zero

**Files touched:**
```
lib/prompts/builders/generate.ts    ← NEW (extract buildGeneratePrompt)
lib/prompts/builders/humanize.ts    ← NEW (extract buildHumanizePrompt)
lib/prompts/builders/score.ts       ← NEW (extract buildScorePrompt)
lib/prompts/builders/rewrite.ts     ← NEW (extract buildRewritePrompt)
lib/prompts/builders/hooks.ts       ← NEW (extract buildHookVariantsPrompt)
lib/prompts/roles/ceo.ts            ← NEW (extract CEO role profile)
lib/prompts/roles/hr.ts             ← NEW ... (14 role files)
lib/prompts/roles/index.ts          ← NEW (ROLE_PROFILES map)
lib/prompts/index.ts                ← NEW (re-exports all builders)
lib/prompts/role-aware-system.ts    ← MODIFY (import from new files; becomes re-export barrel)
```

**Strategy:** Move content out, leave `role-aware-system.ts` as a re-export barrel so no consumers break.

After migration, `role-aware-system.ts` becomes:
```typescript
export { buildGeneratePrompt } from "./builders/generate"
export { buildHumanizePrompt } from "./builders/humanize"
export { ROLE_PROFILES } from "./roles"
// ... etc
```

**Rollback:** `role-aware-system.ts` already re-exports everything. Consumers are unchanged.

---

## Step 14 — Logging Rollout to All API Routes

**Branch:** `arch/14-logging-all-routes`
**Kills:** AP-08 (no request logging) — complete
**Effort:** 4h
**Downtime:** Zero

Apply the structured logging pattern from Step 1 to all 81 API routes. Use a shell script to verify coverage:
```bash
grep -rL "log\." app/api --include="*.ts" | grep route.ts
```
All routes should have `log.info(...)` in the success path and `log.error(...)` in the catch block.

---

## Step 15 — Approval Queue Hook + Thin Page

**Branch:** `arch/15-approvals-page-thin`
**Kills:** AP-01 (continued — approvals/page.tsx)
**Effort:** 3h
**Downtime:** Zero

Move workflow state from `approvals/page.tsx` into `lib/hooks/useApprovalQueue.ts`.

---

## Step 16 — Marketing Content Constants

**Branch:** `arch/16-marketing-constants`
**Kills:** AP-05 (hardcoded arrays) — complete
**Effort:** 2h
**Downtime:** Zero

Move all remaining hardcoded content arrays from `app/page.tsx` and `pricing/page.tsx` into `lib/marketing-content.ts` and `lib/constants.ts`.

---

## Migration Sequence Summary

```
Phase A: Foundation (no behavior changes)
  Step 0: Error/Result types
  Step 1: Structured logging (2 routes)
  Step 2: Domain types extraction
  Step 3: Constants/validation extraction

Phase B: Application Layer Extraction (behavior-identical refactors)
  Step 4: Writer hooks
  Step 5: Writer page split
  Step 6: Settings split
  Step 7: Dashboard hook
  Step 8: Calendar hook
  Step 10: Admin hook

Phase C: Architecture Enforcement
  Step 9: WorkspaceProvider split  ← HIGHEST RISK, needs full Playwright suite
  Step 11: Generate use-case
  Step 12: Approvals use-case

Phase D: Cleanup
  Step 13: Prompts split
  Step 14: Logging all routes
  Step 15: Approvals page thin
  Step 16: Marketing constants
```

---

## Risk Matrix

| Step | Risk | Mitigation |
|------|------|-----------|
| 4 (writer hooks) | Medium — high-traffic component | Run writer E2E before merge; test all 7 writer scenarios |
| 5 (writer split) | Medium — visual regression risk | Screenshot comparison in Playwright |
| 9 (context split) | HIGH — all app state | Full Playwright suite; monitor in staging for 24h before main merge |
| 11 (generate use-case) | Medium — AI generation logic | Test with real Groq API in staging before merge |

---

## Rollback Reference

Every step is reversible via `git revert` of the merge commit. No database changes, no migrations, no infrastructure changes in any step. Rollback time: < 5 minutes per step.

---

## Feature Flag Strategy

For Step 9 (WorkspaceProvider split), add an env var:
```bash
NEXT_PUBLIC_USE_SPLIT_CONTEXT=false  # keep old behavior
NEXT_PUBLIC_USE_SPLIT_CONTEXT=true   # use new split contexts
```

In `ProtectedAppProviders.tsx`:
```typescript
const useSplitContext = process.env.NEXT_PUBLIC_USE_SPLIT_CONTEXT === "true"
return useSplitContext ? <SplitContextProviders /> : <LegacyWorkspaceProvider />
```

Deploy to 10% of users, monitor re-render counts and error rates, then graduate to 100%.
