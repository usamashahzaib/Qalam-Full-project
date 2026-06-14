# Phase 1 — Forensic Audit: Qalam (byqalam-website)

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
