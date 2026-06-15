# Phase 1 — Forensic Audit: Qalam (byqalam-website) — UPDATED POST-MIGRATION STEPS 0-16

> **Stack:** Next.js 16.2.4 · React 19 · TypeScript · Tailwind CSS v4 · NextAuth v5-beta · Supabase REST · Upstash Redis · Groq + Gemini

---

## 1. Repository File Inventory

### Root Configuration

| File | Lines | Actual Responsibility |
|------|-------|-----------------------|
| `auth.ts` | 99 | NextAuth v5 config; JWT + signIn callbacks; OAuth user provisioning |
| `auth.config.ts` | 51 | Route protection matcher; redirect rules |
| `next.config.ts` | 69 | CSP/HSTS headers; image hostnames; bundle config |
| `tsconfig.json` | 35 | Strict mode; `@/*` path alias |
| `tailwind.config.js` | ~120 | Theme extension; 4+ plugins |
| `package.json` | 46 | Dependencies; scripts |
| `proxy.ts` | 202 | Dev request forwarder; NOT production logic |
| `vite.config.js` | 12 | Unit-test runner config (Vitest) |
| `playwright.config.ts` | 24 | E2E test config |

---

### App Directory — Page Route Files

| File | Lines | Actual Responsibility | Violations |
|------|-------|-----------------------|------------|
| `app/layout.tsx` | 224 | Root shell; global metadata; JSON-LD schema.org | Low |
| `app/page.tsx` | **887** | Marketing homepage; framer-motion; inline NICHES[84], FEATURES[20+] arrays | Constants in component; business copy mixed with UI |
| `app/(app)/layout.tsx` | ~80 | App shell wrapper; sidebar nav; session guard | Low |
| `app/(app)/writer/page.tsx` | **1544** | AI post writer UI + generation state + scoring + hook styles + version history | **CRITICAL** — see §4.1 |
| `app/(app)/dashboard/DashboardClient.tsx` | **748** | Stats fetch; chart rendering; post filtering; usage calc | Business logic in component |
| `app/(app)/settings/page.tsx` | **773** | Profile form; billing form; account actions; LinkedIn URL validation | Business logic + inline validation |
| `app/(app)/library/page.tsx` | 470 | Post archive; search; filter | Moderate |
| `app/(app)/library/LibraryGrid.tsx` | 320 | Post grid; pagination | Low |
| `app/(app)/calendar/page.tsx` | **645** | Calendar grid; drag-and-drop; scheduling logic | UI + scheduling logic mixed |
| `app/(app)/voice/page.tsx` | 360 | Voice training UI | Moderate |
| `app/(app)/analytics/page.tsx` | 316 | Usage metrics display | Low |
| `app/(app)/chat/page.tsx` | 432 | AI strategist chat | Moderate |
| `app/(app)/approvals/page.tsx` | 364 | Approval queue; workflow state changes | Workflow logic in component |
| `app/(app)/agency/page.tsx` | 178 | Client workspace list | Low |
| `app/(app)/competitors/page.tsx` | 378 | Competitive research UI + results display | Moderate |
| `app/(app)/carousels/page.tsx` | 202 | Carousel list | Low |
| `app/(app)/carousels/[id]/page.tsx` | 210 | Carousel editor | Moderate |
| `app/admin/AdminDashboard.tsx` | **618** | User search; override forms; audit log parsing | 8 types inline; admin logic in component |
| `app/pricing/page.tsx` | ~30 | Thin wrapper → `PricingPageContent` | Low |
| `app/login/page.tsx` | 205 | Login form; OAuth trigger | Low |
| `app/signup/page.tsx` | 268 | Signup form; validation | Low |

### App Directory — API Routes (81 routes)

| Route Group | Count | Pattern |
|-------------|-------|---------|
| Auth | 10 | Signup, login, verify-email, forgot/reset-password, account CRUD |
| Content Generation | 11 | `/generate/*` — post, carousel, hooks, score, improve, replies |
| Posts CRUD | 4 | `/posts/*` — list, create, reschedule, unschedule, duplicate |
| Carousels CRUD | 5 | `/carousel/*` — list, generate, update, PDF export |
| LinkedIn | 5 | Connect, profile, publish-scheduled, sync-analytics, token |
| Voice | 5 | Profile, analyze, save, train, `me` |
| Admin | 6 | Users, stats, overrides, audit-log, reset-circuits |
| Approvals | 4 | List, approve, reject, review |
| Dashboard | 4 | Stats, recent-posts, usage, workspace |
| Utility | 10+ | Contact, events, jobs, health, payments/webhook, geo/pricing |

All routes follow the same shell:
```typescript
// app/api/generate/route.ts:1-20
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthApi(req)
    const workspace = await resolveWorkspaceId(req)
    const body = await req.json()
    // inline business logic
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

---

### Components Directory

| File | Lines | Actual Responsibility | Violations |
|------|-------|-----------------------|------------|
| `components/providers/WorkspaceProvider.tsx` | **491** | ALL global state: posts, billing, profile, agency, events, mutations | **God class** — see §4.2 |
| `components/AppShell.tsx` | 431 | App layout; sidebar navigation; mobile nav | Low |
| `components/Navbar.tsx` | 392 | Global nav; plan-gated items; mobile hamburger | Moderate |
| `components/chat-panel.tsx` | **457** | Chat message rendering; markdown parsing; code highlighting | Rendering logic mixed with UI |
| `components/tools/CarouselBuilderTool.tsx` | **487** | Carousel editor UI + slide reordering + PDF export logic | Logic in component |
| `components/tools/HookGeneratorTool.tsx` | 208 | Hook generation UI | Low |
| `components/PricingPageContent.tsx` | 554 | Pricing table; plan comparison; feature gates | Constants inline |
| `components/ContactForm.tsx` | 211 | Contact form; submit logic | Low |
| `components/ui/qalam-icons.tsx` | 198 | SVG icon library | Low |
| `components/AppMobileNav.tsx` | 118 | Mobile sidebar | Low |
| `components/providers/AuthSlidePanel.tsx` | 132 | Auth modal | Low |

---

### Lib Directory

| File | Lines | Actual Responsibility | Coupling |
|------|-------|-----------------------|----------|
| `lib/pricing.ts` | 284 | Plan definitions; pricing; feature matrix | Standalone ✓ |
| `lib/entitlements.ts` | 143 | PLAN_LIMITS; `canAccessPlan`; `hasFeatureAccess` | Standalone ✓ |
| `lib/seo.ts` | 255 | SEO metadata builders | Low |
| `lib/site-content.ts` | 286 | Marketing copy objects | Low |
| `lib/seo-landing-pages.ts` | 416 | Dynamic SEO page registry | Low |
| `lib/marketing-content.ts` | 344 | Use-case + product page data | Low |
| `lib/content-intelligence.ts` | 285 | Content analysis; scoring helpers | Low |
| `lib/carousel-design.ts` | 173 | Carousel generation logic | Low |
| `lib/voice-analyzer.ts` | 179 | Voice profile analysis | Low |
| `lib/content-profiles.ts` | 119 | Role-content profiles | Low |
| `lib/prompts/role-aware-system.ts` | **1354** | 14 role system prompts; 5 generation pipelines | Monolithic |
| `lib/server/auth.ts` | 219 | `requireAuthApi`; `withAuth`; OAuth provisioning | Moderate |
| `lib/server/workspace.ts` | 389 | Workspace resolution; plan fetching; override application | Moderate |
| `lib/server/supabase-rest.ts` | 126 | REST wrapper: `supabaseSelect`, `supabasePatch`, `supabaseInsert`, `supabaseDelete` | **No type safety on query strings** |
| `lib/server/content-generator.ts` | **465** | 3-pass AI generation pipeline | Moderate |
| `lib/server/ai-router-v2.ts` | 192 | LLM routing (Groq primary, Gemini fallback) | Moderate |
| `lib/server/plan-limits-v2.ts` | 171 | Plan quota checking + atomic increment | Low |
| `lib/server/payments.ts` | 208 | Payment webhook verification and persistence | Low |
| `lib/server/competitors.ts` | 238 | Competitive research API calls | Low |
| `lib/server/linkedin-credentials.ts` | 135 | LinkedIn token management | Low |
| `lib/server/queue.ts` | 143 | Job queue abstraction (Upstash) | Low |
| `lib/server/queue-processor.ts` | 145 | Background job handler | Low |
| `lib/server/circuit-breaker.ts` | ~90 | Circuit breaker for AI calls | Low |
| `lib/server/rate-limit.ts` | 90 | Upstash sliding-window rate limits | Low |
| `lib/server/email.ts` | ~80 | Transactional email via Resend | Low |
| `lib/api/client.ts` | 131 | Fetch wrapper for client→API calls | Low |

### Types Directory

| File | Lines | Actual Responsibility |
|------|-------|-----------------------|
| `types/domain.ts` | 127 | Core domain types: Post, VoiceProfile, Team, ClientWorkspace, ApprovalRequest, AnalyticsSnapshot |
| `types/next-auth.d.ts` | ~20 | NextAuth session augmentation |

---

## 2. Files Exceeding 300 Lines (18 Hotspots)

| Rank | File | Lines | Hotspot Type |
|------|------|-------|--------------|
| 1 | `app/(app)/writer/page.tsx` | 1544 | God Component |
| 2 | `lib/prompts/role-aware-system.ts` | 1354 | Monolithic config |
| 3 | `app/page.tsx` | 887 | Marketing + constants |
| 4 | `app/(app)/settings/page.tsx` | 773 | Mixed form + logic |
| 5 | `app/(app)/dashboard/DashboardClient.tsx` | 748 | Data + rendering |
| 6 | `app/(app)/calendar/page.tsx` | 645 | UI + scheduling |
| 7 | `app/admin/AdminDashboard.tsx` | 618 | Admin god component |
| 8 | `components/PricingPageContent.tsx` | 554 | Data + rendering |
| 9 | `components/tools/CarouselBuilderTool.tsx` | 487 | UI + editing logic |
| 10 | `components/providers/WorkspaceProvider.tsx` | 491 | God context |
| 11 | `components/chat-panel.tsx` | 457 | Rendering + parsing |
| 12 | `lib/server/content-generator.ts` | 465 | AI pipeline |
| 13 | `app/(app)/library/page.tsx` | 470 | Search + filter |
| 14 | `app/(app)/competitors/page.tsx` | 378 | UI + logic |
| 15 | `app/(app)/approvals/page.tsx` | 364 | Workflow in UI |
| 16 | `app/(app)/voice/page.tsx` | 360 | Recording + analysis |
| 17 | `app/(app)/chat/page.tsx` | 432 | Chat state |
| 18 | `lib/marketing-content.ts` | 344 | Config (acceptable) |

---

## 3. Coupling Violations

### 3.1 Import Dependency Map (internal paths only)

```mermaid
graph TD
    W[writer/page.tsx] --> WP[WorkspaceProvider]
    W --> ENT[lib/entitlements]
    W --> CG[lib/content-guard]
    W --> API_GEN[/api/generate]
    W --> API_POSTS[/api/posts]
    W --> API_VOICE[/api/voice/analyze]

    WP --> ENT
    WP --> NEXT_AUTH[next-auth/react]
    WP --> API_DASH[/api/dashboard/*]
    WP --> API_POSTS
    WP --> API_EVENTS[/api/events]
    WP --> API_JOBS[/api/jobs]

    DASH[DashboardClient.tsx] --> WP
    DASH --> API_DASH

    SETTINGS[settings/page.tsx] --> WP
    SETTINGS --> API_AUTH[/api/auth/*]
    SETTINGS --> API_LI[/api/linkedin/*]

    API_POSTS_ROUTE[api/posts/route.ts] --> SERVER_AUTH[lib/server/auth]
    API_POSTS_ROUTE --> SERVER_WS[lib/server/workspace]
    API_POSTS_ROUTE --> SUPA[lib/server/supabase-rest]

    API_GEN_ROUTE[api/generate/route.ts] --> SERVER_AUTH
    API_GEN_ROUTE --> SERVER_WS
    API_GEN_ROUTE --> SUPA
    API_GEN_ROUTE --> CONTENT_GEN[lib/server/content-generator]
    API_GEN_ROUTE --> PLAN_LIM[lib/server/plan-limits-v2]

    CONTENT_GEN --> AI_ROUTER[lib/server/ai-router-v2]
    CONTENT_GEN --> PROMPTS[lib/prompts/role-aware-system]
    AI_ROUTER --> GROQ[Groq API]
    AI_ROUTER --> GEMINI[lib/server/gemini-client]
    AI_ROUTER --> CB[lib/server/circuit-breaker]
    AI_ROUTER --> QUEUE[lib/server/queue]

    SERVER_AUTH --> SUPA
    SERVER_WS --> SUPA
    SERVER_WS --> OVERRIDES[lib/server/overrides]
    PLAN_LIM --> SUPA
```

### 3.2 Cross-Boundary Violations

| From | To | Violation |
|------|----|-----------|
| `writer/page.tsx` | Business rules (generation, scoring) | UI layer contains domain logic |
| `WorkspaceProvider.tsx` | 15 API endpoints | Single component calls 15 different APIs |
| `settings/page.tsx` | LinkedIn URL validation | Validation logic in UI component |
| `AdminDashboard.tsx` | Admin type definitions | Domain types defined in UI component |
| `app/page.tsx` | NICHES[84], FEATURES[20+] | Config data hardcoded in UI |
| `supabase-rest.ts` | Raw string query filters | No type safety on column names |

---

## 4. Detailed File Analysis — Critical Files

### 4.1 `app/(app)/writer/page.tsx` (1544 lines) — CRITICAL GOD COMPONENT

**What it actually does (7 separate concerns):**

1. **UI rendering** — Form fields, toolbar, preview panel
2. **Role & format management** — 14 roles × 6 format options inline
3. **Generation orchestration** — Calls `/api/generate`, handles 3-pass results
4. **Hook generation** — 4 hook styles, UI to select and insert
5. **Post scoring** — Score breakdown visualization, retry logic
6. **Version history** — Draft comparison, restore old versions
7. **Schedule/publish** — Date picker, plan-gated publish action

**Inline type definitions (should be in `types/writer.ts`):**
```typescript
// writer/page.tsx:12-60 (approximate)
type Role = "HR" | "Marketing" | "Founder" | "Sales" | ...  // 14 values
type FormatKey = "Short" | "Medium" | "Long" | "Carousel"
type HookStyle = "SHARP" | "AUTHORITY" | "STORY" | "DATA"
type DraftVersion = { content: string; timestamp: string }
type ScoreData = { overall: number; hooks: number; cta: number; ... }
```

**Inline constants (should be in `lib/constants.ts`):**
```typescript
// writer/page.tsx:~80-120
const ROLES: Role[] = ["HR", "Marketing", "Founder", ...]  // 14 entries
const FORMATS: FormatKey[] = [...]
const SCORE_LABELS = { hooks: "Hook Strength", ... }
```

**Inline helper functions (should be in `lib/writer-utils.ts`):**
```typescript
const todayInput = () => new Date().toISOString().slice(0, 16)
const scheduleError = (d: Date) => d <= new Date() ? "must be future" : null
const scoreBarColor = (score: number) => score >= 80 ? "green" : ...
```

**useState count:** 50+ state variables in a single component. Every state change triggers full component re-render tree.

### 4.2 `components/providers/WorkspaceProvider.tsx` (491 lines) — GOD CONTEXT

**15 public API methods on context value:**
```
saveDraft, updateDraft, deleteDraft, schedulePost, unschedulePost,
publishPost, saveProfile, saveVoiceProfile, addClient, removeClient,
addTeamMember, removeTeamMember, trackEvent, loadJobs, createJob
```

**State shape covers 6 domains in one object:**
```typescript
{
  posts: WorkspacePost[]      // Content domain
  billing: WorkspaceBilling   // Payment domain
  profile: WorkspaceProfile   // User domain
  agency: AgencyState         // Agency domain
  competitors: Competitor[]   // Research domain
  events: EventLog[]          // Analytics domain
}
```

**On mount:** fetches from 6+ API endpoints simultaneously with no deduplication.

### 4.3 `lib/server/supabase-rest.ts` (126 lines) — UNTYPED QUERY LAYER

```typescript
// lib/server/supabase-rest.ts:45-60 (approximate)
export async function supabaseSelect<T>(
  table: string,
  filter: string  // ← raw string: "workspace_id=eq.${id}&order=created_at.desc"
): Promise<T[]>
```

Column names are strings. No compile-time validation. Typos and renamed columns silently return empty arrays.

### 4.4 `lib/prompts/role-aware-system.ts` (1354 lines) — MONOLITHIC PROMPT FILE

Contains 5 distinct prompt builders and 14 role profiles in a single file. Changes to one role's prompt require touching a 1354-line file, with high risk of merge conflicts in a team setting.

---

## 5. Hidden Domain Concepts Buried in UI

The following domain concepts exist only inside page components and have no representation in `types/domain.ts` or `lib/`:

| Domain Concept | Currently Buried In | Should Live In |
|---------------|---------------------|----------------|
| `WriterRole` (14 roles) | `writer/page.tsx:12` | `types/writer.ts` |
| `PostFormat` (Short/Medium/Long/Carousel) | `writer/page.tsx:45` | `types/writer.ts` |
| `HookStyle` (4 styles) | `writer/page.tsx:52` | `types/writer.ts` |
| `ScoreBreakdown` | `writer/page.tsx:65` | `types/writer.ts` |
| `DraftVersion` | `writer/page.tsx:78` | `types/domain.ts` |
| `AdminUser` | `AdminDashboard.tsx:12` | `types/admin.ts` |
| `AdminOverride` | `AdminDashboard.tsx:30` | `types/admin.ts` |
| `AuditLogEntry` | `AdminDashboard.tsx:45` | `types/admin.ts` |
| `IndustryOption` | `settings/page.tsx:80` | `lib/constants.ts` |
| `AccountRole` | `settings/page.tsx:95` | `lib/constants.ts` |
| `CalendarEvent` | `calendar/page.tsx:20` | `types/domain.ts` |
| LinkedIn URL validation rule | `settings/page.tsx:110` | `lib/validation.ts` |

---

## 6. Dependency Graph — Current State (Mermaid)

```mermaid
graph LR
    subgraph PRESENTATION["PRESENTATION (Browser)"]
        W[writer/page]
        DASH[dashboard/DashboardClient]
        SET[settings/page]
        CAL[calendar/page]
        ADM[AdminDashboard]
        WP[WorkspaceProvider]
        NAV[Navbar]
        APP[AppShell]
    end

    subgraph API_LAYER["API ROUTES (Server)"]
        GEN[/api/generate]
        POSTS[/api/posts]
        VOICE_API[/api/voice]
        LI_API[/api/linkedin]
        ADMIN_API[/api/admin]
        DASH_API[/api/dashboard]
        APPROV[/api/approvals]
        CAROUSEL_API[/api/carousel]
    end

    subgraph SERVER_LIB["SERVER UTILITIES"]
        AUTH_SRV[lib/server/auth]
        WS_SRV[lib/server/workspace]
        PLAN_SRV[lib/server/plan-limits-v2]
        CONTENT_GEN[lib/server/content-generator]
        AI_ROUTER[lib/server/ai-router-v2]
        SUPA[lib/server/supabase-rest]
        PAYMENTS[lib/server/payments]
        EMAIL[lib/server/email]
    end

    subgraph DOMAIN_LIB["DOMAIN / BUSINESS RULES"]
        PRICING[lib/pricing]
        ENT[lib/entitlements]
        PROMPTS[lib/prompts/role-aware-system]
        CONTENT_INT[lib/content-intelligence]
        DOMAIN_T[types/domain]
    end

    subgraph INFRA["INFRASTRUCTURE"]
        GROQ[(Groq API)]
        GEMINI_API[(Gemini API)]
        SUPABASE[(Supabase DB)]
        REDIS[(Upstash Redis)]
        RESEND[(Resend Email)]
        LI_EXT[(LinkedIn API)]
    end

    %% Presentation → API
    W --> GEN
    W --> POSTS
    W --> VOICE_API
    WP --> DASH_API
    WP --> POSTS
    DASH --> DASH_API
    SET --> AUTH_SRV
    SET --> LI_API
    ADM --> ADMIN_API
    CAL --> POSTS
    NAV --> ENT

    %% API → Server Lib
    GEN --> AUTH_SRV
    GEN --> WS_SRV
    GEN --> CONTENT_GEN
    GEN --> PLAN_SRV
    POSTS --> AUTH_SRV
    POSTS --> WS_SRV
    POSTS --> SUPA
    ADMIN_API --> AUTH_SRV
    ADMIN_API --> SUPA
    LI_API --> AUTH_SRV
    LI_API --> LI_EXT

    %% Server Lib → Domain
    CONTENT_GEN --> PROMPTS
    CONTENT_GEN --> AI_ROUTER
    PLAN_SRV --> ENT
    AUTH_SRV --> SUPA
    WS_SRV --> SUPA

    %% Server Lib → Infra
    AI_ROUTER --> GROQ
    AI_ROUTER --> GEMINI_API
    SUPA --> SUPABASE
    PLAN_SRV --> REDIS
    EMAIL --> RESEND
    PAYMENTS --> SUPABASE

    %% Domain contains business rules — no infra deps (good)
    ENT --> PRICING

    %% RED FLAGS: Presentation layer knows domain types directly
    W --> DOMAIN_T
    WP --> ENT
    ADM --> DOMAIN_T
```

---

## 7. Cyclomatic Hotspots

| File | Cyclomatic Complexity Indicator | Why |
|------|---------------------------------|-----|
| `writer/page.tsx` | CRITICAL | 50+ state vars; generation retry loop; role × format matrix; schedule validation; score retry branching |
| `WorkspaceProvider.tsx` | HIGH | 15 async mutation methods; state merge on every API response |
| `AdminDashboard.tsx` | HIGH | Admin unlock flow; form state; user search; override CRUD; audit log |
| `settings/page.tsx` | HIGH | Profile form; billing flow; LinkedIn connect flow; password change flow; account deletion flow |
| `calendar/page.tsx` | HIGH | Calendar grid; date arithmetic; drag-drop; status transitions |
| `lib/server/content-generator.ts` | HIGH | 3-pass pipeline; retry loop; score threshold; circuit breaker check |
| `lib/server/auth.ts` | MEDIUM | Credentials vs OAuth branching; user provisioning; workspace creation |
| `lib/server/workspace.ts` | MEDIUM | Workspace resolution; plan override merging; plan hierarchy |

---

## 8. Anti-Pattern Registry

### AP-01: Business Logic in UI Components
**Files:** `writer/page.tsx`, `settings/page.tsx`, `calendar/page.tsx`, `AdminDashboard.tsx`, `DashboardClient.tsx`
**Evidence:** Generation, scoring, scheduling, form validation, chart aggregation all live inside React components.
**Impact:** Cannot unit-test business logic without rendering DOM; logic can't be reused across surfaces.

### AP-02: God Context Provider
**File:** `components/providers/WorkspaceProvider.tsx:1-491`
**Evidence:** 15 mutation methods + 6 domain state slices in one React context. Every mutation triggers re-render of entire app tree.
**Impact:** Performance regression at scale; cannot swap state management strategy without full rewrite.

### AP-03: Untyped Query Layer
**File:** `lib/server/supabase-rest.ts:45-80`
**Evidence:** Column names and filter expressions are raw strings. No compile-time validation.
**Impact:** Renamed columns silently return empty arrays; injection risk if URL encoding is skipped.

### AP-04: Domain Types in UI
**Files:** `writer/page.tsx`, `AdminDashboard.tsx`, `settings/page.tsx`
**Evidence:** 30+ type definitions scattered across components instead of `types/`.
**Impact:** Duplicate types; no single source of truth; refactoring requires finding all instances.

### AP-05: Hardcoded Configuration in Components
**Files:** `app/page.tsx` (NICHES[84], FEATURES[20+]), `settings/page.tsx` (14 industry options), `pricing/page.tsx`
**Evidence:** Business content arrays defined inside React components.
**Impact:** Content changes require code deployments; untestable without rendering.

### AP-06: Monolithic Prompt File
**File:** `lib/prompts/role-aware-system.ts:1-1354`
**Evidence:** 5 prompt builders × 14 roles in one file. 100% change rate when any prompt is tuned.
**Impact:** Merge conflicts; no isolation of individual role prompts; can't A/B test.

### AP-07: No ORM — String-Based Queries
**File:** `lib/server/supabase-rest.ts`
**Evidence:** `supabaseSelect("posts", \`workspace_id=eq.${id}\`)` — column names as strings.
**Impact:** Typos silently break queries; no IDE autocomplete; no migration safety net.

### AP-08: Missing Request Logging
**All API routes**
**Evidence:** No structured logger; only `console.error` in catch blocks.
**Impact:** Cannot debug production issues; no request correlation IDs; no audit trail for AI calls.

### AP-09: Dual User ID System
**Files:** `auth.ts`, `lib/server/auth.ts`, `lib/server/workspace.ts`
**Evidence:** Users have both `external_user_id` (OAuth sub) and internal UUID. Different code paths use different IDs.
**Impact:** Confusion about which ID to pass; provisioning bugs when IDs mismatch.

### AP-10: No Data Fetching Layer / Cache
**Files:** `WorkspaceProvider.tsx`, `DashboardClient.tsx`, multiple page components
**Evidence:** Manual `useEffect + fetch + setState`; no SWR/React Query; no request deduplication.
**Impact:** Redundant API calls on re-renders; stale data shown until next mount; race conditions.

---

## 9. Top 10 Architectural Sins — Ranked by Blast Radius

| Rank | Sin | Blast Radius | Files Affected |
|------|-----|--------------|----------------|
| **1** | **God Component: writer/page.tsx (1544 lines)** | CRITICAL — single file serves as UI, state manager, business logic, and AI orchestrator. Any regression risk is maximum. | 1 file → test coverage gap across 7 concern areas |
| **2** | **God Context: WorkspaceProvider (491 lines, 15 methods)** | CRITICAL — entire app re-renders on every mutation; untestable without mocking 15 API endpoints; blocks state management evolution | 1 file → all 15 app pages |
| **3** | **No ORM: string-based Supabase queries** | HIGH — typos in column names silently return empty data; impossible to refactor DB schema with confidence | `supabase-rest.ts` → all 81 API routes |
| **4** | **Business logic in 5 large page components** | HIGH — cannot write unit tests for generation, scoring, or scheduling without rendering full React trees | 5 files → 0% business logic test coverage |
| **5** | **Domain types scattered across components** | HIGH — 30+ types defined inline; no single source of truth; refactoring requires codebase-wide search | 8 files → all types |
| **6** | **Monolithic prompts file (1354 lines)** | MEDIUM — 100% churn on any prompt update; blocks A/B testing; merge conflicts guaranteed in team | 1 file → all AI generation |
| **7** | **No structured logging or request IDs** | MEDIUM — production debugging is impossible; no way to trace a failing generation request end-to-end | All 81 API routes |
| **8** | **Manual fetch + setState (no SWR/React Query)** | MEDIUM — race conditions; stale data; redundant API calls; re-fetch on every page navigation | `WorkspaceProvider.tsx` + 10 page components |
| **9** | **Hardcoded content arrays in components** | LOW-MEDIUM — content changes require code deploys; copy is mixed with rendering logic | `app/page.tsx`, `settings/page.tsx`, `pricing/page.tsx` |
| **10** | **Dual user ID system (external + internal)** | LOW-MEDIUM — cognitive overhead; provisioning edge cases; different IDs used inconsistently | `auth.ts`, `lib/server/auth.ts`, all workspace resolution |

---

## 10. Positive Patterns to Preserve

These are well-designed and should NOT be touched in migration:

| Pattern | Files | Why It's Good |
|---------|-------|---------------|
| Server-side DB access only | All API routes | Components never call Supabase directly |
| Plan entitlements standalone | `lib/pricing.ts`, `lib/entitlements.ts` | Zero external deps; easily unit-testable |
| 3-pass AI generation pipeline | `lib/server/content-generator.ts` | Correct separation of LLM I/O from business rules |
| Circuit breaker on AI calls | `lib/server/circuit-breaker.ts` | Resilience pattern correctly applied |
| Row-level security at DB | `supabase/migrations/0008_auth_rls.sql` | Defense in depth for multi-tenant data |
| Zod validation on API routes | Most API routes | Input validation at system boundary |
| JWT strategy (not DB sessions) | `auth.ts` | Scales horizontally without session store |
| `requireAuthApi` + `withAuth` wrappers | `lib/server/auth.ts` | Consistent auth enforcement pattern |

---

---

# CURRENT-STATE AUDIT — After Migration Steps 0–16
**Conducted:** 2026-06-15 (post-commit `e3ee939`)

The codebase has been through 16 migration steps since the original audit above was written. This section captures the true current state, what was fixed, what remains broken, and what net-new violations appeared.

---

## Migration Progress Summary

| Steps | Commit | What Changed |
|-------|--------|-------------|
| 0–8 | `37a498c` | Result<T> errors, structured logging, domain types, constants/validation, useWriterLogic, modal sub-components, useProfileForm, useDashboardMetrics |
| 8–13 | `1b2ab4c` | Additional architectural extraction (details below) |
| 14–16 | `e3ee939` | Further refactoring |

### What Got Fixed (Verified Against Current State)

| Original Sin | Status | Evidence |
|-------------|--------|----------|
| `writer/page.tsx` was 1544 lines | **FIXED** | Now 998 lines — logic extracted to `useWriterLogic.ts` |
| `lib/prompts/role-aware-system.ts` was 1354 lines | **FIXED** | Now 746 lines — role profiles extracted to `role-profiles.ts` |
| No `Result<T>` error type | **FIXED** | `lib/errors.ts` clean Result<T>/QalamError pattern |
| No structured logging | **FIXED** | `lib/server/logging.ts` exists, used in routes |
| No use cases | **PARTIALLY FIXED** | 2 use cases exist: `generate-post.ts` + `run-approval.ts` |
| No hooks extracted | **FIXED** | `useWriterLogic.ts`, `useDashboardMetrics.ts`, `useProfileForm.ts`, `useAdminUsers.ts`, `useCalendarLogic.ts`, `useApprovalQueue.ts` |
| Writer modals inline | **FIXED** | `WriterScheduleModal.tsx`, `WriterDeleteConfirm.tsx` extracted |
| `DashboardClient.tsx` at 748 lines | **FIXED** | Now 678 lines — metrics extracted to `useDashboardMetrics.ts` |

---

## Current Architectural Violations (As Of 2026-06-15)

### ACTIVE SIN #1: Four Conflicting Plan Tier Definitions
**Blast radius: 10/10 — unchanged from original audit**

```typescript
// types/domain.ts:4
PlanTier = "free" | "pro" | "team" | "agency"   // "team" does not exist as a product

// lib/entitlements.ts:1
PlanTier = "Free" | "Solo" | "Pro" | "Agency"    // Title-case, "Solo" not in domain.ts

// lib/server/plan-limits-v2.ts:6
PlanName = "free" | "solo" | "pro" | "agency"    // lowercase, different variable name

// components/providers/WorkspaceProvider.tsx:37
plan: "Free" | "Solo" | "Pro" | "Agency" | "Agency Starter" | "Agency Growth"   // 6 variants
```

`PLAN_CONFIG` in `plan-limits-v2.ts` (server enforced) and `PLAN_LIMITS` in `entitlements.ts` (client displayed) are **separate objects** that must be kept manually in sync. This is the highest-priority sin remaining.

**Files:** `types/domain.ts:4`, `lib/entitlements.ts:1-10`, `lib/server/plan-limits-v2.ts:6-14`, `components/providers/WorkspaceProvider.tsx:37`

---

### ACTIVE SIN #2: `WorkspaceProvider.tsx` — God Context (491 lines)
**Blast radius: 9/10 — unchanged**

Still does: workspace resolution, auth redirect, billing persistence (localStorage), post CRUD, profile CRUD, event tracking, job management, loading/error UI rendering. Six separate domains in one React context.

Notable: `billing` state is persisted to `localStorage` (`BILLING_STORAGE_KEY = "qalam-billing-v3"` at line 91). This means billing plan shown in the UI is cached and can be stale. Server billing comes from `/api/workspace` on mount and is merged in. Race condition possible between cached plan and actual plan.

**File:** `components/providers/WorkspaceProvider.tsx:1-492`

---

### ACTIVE SIN #3: `useWriterLogic.ts` Imports from `components/`
**Blast radius: 8/10**

```typescript
// lib/hooks/useWriterLogic.ts:5-6
import { incrementDraftUsage, readDraftUsage } from "@/components/DraftCounter"
```

Library code depends on a UI component's internal implementation. Draft usage is tracked TWICE — via this localStorage counter AND via `incrementUsage()` in the API route, which persists to Supabase. These can drift.

**File:** `lib/hooks/useWriterLogic.ts:5-6`, `lib/hooks/useWriterLogic.ts:241-243`

---

### ACTIVE SIN #4: `lib/content-intelligence.ts` Imports from `components/`
**Blast radius: 7/10 — Dependency Rule violation**

```typescript
// lib/content-intelligence.ts:1
import type { WorkspaceProfile } from "@/components/providers/WorkspaceProvider"
```

Domain service imports from a React provider. Makes this file untestable without React. `WorkspaceProfile` should be in `types/domain.ts`.

**File:** `lib/content-intelligence.ts:1`

---

### ACTIVE SIN #5: Two Parallel AI Routers
**Blast radius: 7/10**

- `lib/server/ai-router.ts` (v1) — DEPRECATED, still imported by:
  - `lib/voice-analyzer.ts:1`
  - `lib/server/content-generator.ts:6` (itself deprecated)
- `lib/server/ai-router-v2.ts` (v2) — current

Circuit breaker behavior, Groq model name, Gemini fallback, rate limiting — all changes must be applied twice or they diverge. Voice analysis uses a different AI router than post generation.

**Files:** `lib/voice-analyzer.ts:1`, `lib/server/content-generator.ts:6`

---

### ACTIVE SIN #6: `lib/server/plan-limits-v2.ts` — Domain + Infrastructure Fused
**Blast radius: 6/10**

Single file contains:
- `PLAN_CONFIG` (domain data: limits per plan) — lines 9-14
- `normalizePlan()` (domain function) — lines 18-24
- `isFeatureAllowed()` (domain rule) — lines 161-172
- `getPlanStatus()` (3 parallel Supabase queries) — lines 34-113
- `incrementUsage()` (Supabase RPC) — lines 130-158

A product decision ("Pro gets 80 drafts") requires touching the same file as an infrastructure change ("RPC was renamed"). One reason to change = one file. This violates that.

**File:** `lib/server/plan-limits-v2.ts:1-172`

---

### ACTIVE SIN #7: `lib/server/content-generator.ts` — Deprecated Parallel Universe (465 lines)
**Blast radius: 6/10**

Three explicitly `@deprecated` exports at lines 414-465: `scoreContent`, `qualityControlDraft`, `generateHooks`. This file imports `ai-router` v1. It runs in parallel with `lib/use-cases/generate-post.ts` (the correct pattern). Any developer who finds this file first gets the wrong mental model. It should be deleted after verifying no active imports.

**File:** `lib/server/content-generator.ts:414-465`

---

### ACTIVE SIN #8: 13 Missing Use Cases
**Blast radius: 6/10 — domain logic still inline in routes**

Only 2 of ~15 domain operations have been extracted to use cases:
- `lib/use-cases/generate-post.ts` ✅
- `lib/use-cases/run-approval.ts` ✅

These operations still have domain logic inline in API routes:
- GenerateHooks (`/api/generate/hooks/route.ts` — contains `ROLE_MAP` domain mapping)
- ScorePost (`/api/generate/score/route.ts`)
- ImprovePost (`/api/generate/improve/route.ts`)
- TrainVoiceProfile (`/api/voice/train/route.ts`)
- PublishToLinkedIn (`/api/linkedin/share/route.ts`)
- SchedulePost (`/api/posts/route.ts`)
- AnalyzeCompetitor (`/api/competitors/analyze/route.ts`)
- GenerateCarousel (`/api/carousel/generate/route.ts`)
- ExportPost PDF (`/api/carousel/[id]/pdf/route.ts`)
- GetDashboardMetrics (`/api/dashboard/stats/route.ts`)
- ManageWorkspace (`/api/workspace/route.ts`)
- AdminOverrideUser (`/api/admin/overrides/route.ts`)
- GenerateReplies (`/api/generate/replies/route.ts`)

**Files:** All API routes listed above

---

### ACTIVE SIN #9: `app/api/generate/route.ts` PATCH Handler — Inline Authorization
**Blast radius: 5/10**

```typescript
// app/api/generate/route.ts:106-115
const { data: membership } = await supabase
  .from("memberships")
  .select("id")
  .eq("workspace_id", post.workspace_id)
  .eq("user_id", user.internalId)
  .single()

if (!membership) {
  return NextResponse.json({ error: "Not authorized" }, { status: 403 })
}
```

Authorization policy ("does user belong to this workspace?") inline in HTTP handler. Should be in a repository or domain service.

**File:** `app/api/generate/route.ts:82-130`

---

### ACTIVE SIN #10: `useWriterLogic.ts` Makes Inline Fetch Calls
**Blast radius: 5/10**

The hook directly calls `fetch("/api/generate/score", ...)`, `fetch("/api/generate/hooks", ...)`, `fetch("/api/generate/post", ...)` etc. with hardcoded URL strings. If an API route is renamed or moved, the hook silently breaks. No abstraction layer between hook and HTTP.

**Files:** `lib/hooks/useWriterLogic.ts` — multiple fetch calls with string literals

---

## Current File Sizes (Verified 2026-06-15)

| File | Lines | Status vs Original |
|------|-------|--------------------|
| `app/(app)/writer/page.tsx` | 998 | Was 1544 — IMPROVED ✅ |
| `lib/prompts/role-aware-system.ts` | 746 | Was 1354 — IMPROVED ✅ |
| `lib/prompts/role-profiles.ts` | 616 | New file (extracted) ✅ |
| `lib/hooks/useWriterLogic.ts` | 678 | New file (extracted) — but has SIN #3 |
| `app/(app)/dashboard/DashboardClient.tsx` | 678 | Was 748 — slightly improved |
| `app/(app)/settings/page.tsx` | 703 | Was 773 — slightly improved |
| `app/(app)/calendar/page.tsx` | 443 | Was 645 — IMPROVED ✅ |
| `app/admin/AdminDashboard.tsx` | 448 | Was 618 — IMPROVED ✅ |
| `components/providers/WorkspaceProvider.tsx` | 491 | Unchanged — GOD OBJECT |
| `lib/server/content-generator.ts` | 465 | DEPRECATED — should be killed |
| `lib/server/workspace.ts` | 389 | Unchanged |
| `lib/server/auth.ts` | 226 | Unchanged |

---

## What Is Clean — Do Not Regress

| File | Why It's Good |
|------|--------------|
| `lib/errors.ts` | Result<T>/QalamError, zero framework imports |
| `lib/use-cases/generate-post.ts` | Correct pattern: `server-only`, Result<T>, use case boundary |
| `lib/use-cases/run-approval.ts` | Correct pattern, clean |
| `lib/server/circuit-breaker.ts` | Single responsibility, Redis abstraction |
| `lib/server/ai-router-v2.ts` | Clean provider routing, properly isolated |
| `lib/server/gemini-client.ts` | Clean infrastructure adapter |
| `lib/server/email.ts` | Clean infrastructure adapter |
| `lib/server/queue.ts` | Clean Redis caching + rate limit |
| `lib/prompts/role-profiles.ts` | Pure data, zero imports — textbook domain data |
| `app/api/approvals/route.ts` | Thin HTTP wrapper, fully delegates to use case |
| `app/api/generate/route.ts` POST | Thin HTTP wrapper, delegates to use case |
| `types/writer.ts` | Clean presentation-layer types |
| `lib/validation.ts` | Input validation schemas at system boundary |
| `lib/server/logging.ts` | Structured logging, cross-cutting concern |

---

## Dependency Rule Violations (Active)

The Dependency Rule states: inner layers cannot import from outer layers.

```
Domain → (nothing)
Infrastructure → Domain
Application → Domain + Infrastructure
Presentation → Application + (never Domain or Infrastructure directly)
```

| Violation | File | Illegal Import |
|-----------|------|---------------|
| lib → components | `lib/content-intelligence.ts:1` | `WorkspaceProfile` from `components/providers/WorkspaceProvider` |
| hooks → components | `lib/hooks/useWriterLogic.ts:5` | `incrementDraftUsage`, `readDraftUsage` from `components/DraftCounter` |
| domain types circular | `types/domain.ts:4` | `PlanTier` includes "team" which does not exist in any live plan definition |

---

## Priority Order for Remaining Migration

Ordered by: (blast radius × coupling × frequency of change)

1. **Unify plan tier definitions** — Single source of truth for plan names, limits, and feature flags. Kill `types/domain.ts` PlanTier, merge `lib/entitlements.ts` and `lib/server/plan-limits-v2.ts` into `domain/workspace/PlanRules.ts`.

2. **Fix Dependency Rule violations** — Move `WorkspaceProfile` type out of `WorkspaceProvider.tsx` into `types/domain.ts`. Fix `useWriterLogic.ts` import of `DraftCounter`.

3. **Kill the deprecated parallel universe** — Delete `lib/server/content-generator.ts` and `lib/server/ai-router.ts` after confirming zero active imports. Fix `lib/voice-analyzer.ts` to import `ai-router-v2`.

4. **Extract the 13 missing use cases** — Highest ROI: `GenerateHooks`, `ScorePost`, `TrainVoiceProfile`, `AnalyzeCompetitor`.

5. **Split `WorkspaceProvider.tsx`** — Separate into: workspace resolver hook, billing context, post repository, profile repository.

6. **Add repository interfaces** — `IPostRepository`, `IVoiceProfileRepository`, `IPlanUsageRepository` — allowing infrastructure swap without touching application code.

