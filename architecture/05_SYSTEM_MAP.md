# Phase 5 — Visual System Map

> C4 model (Context → Container → Component → Code) + critical user journey sequence diagrams + module dependency matrix.

---

## 1. C4 Level 1 — System Context

```mermaid
C4Context
    title Qalam — System Context

    Person(user, "LinkedIn Creator", "Publishes professional content on LinkedIn. May be a solo professional, agency, or team member.")
    Person(reviewer, "Content Reviewer", "Agency client or team member who approves posts before publishing.")
    Person(admin, "Qalam Admin", "Internal team member managing plans, overrides, and audit logs.")

    System(qalam, "Qalam", "AI-powered LinkedIn publishing platform. Generates, scores, schedules, and publishes content. Manages voice profiles and approval workflows.")

    System_Ext(linkedin, "LinkedIn API", "OAuth authentication and post publishing.")
    System_Ext(groq, "Groq API", "LLM inference (llama-3.1-8b-instant) for content generation.")
    System_Ext(gemini, "Google Gemini", "Fallback LLM for content generation.")
    System_Ext(supabase, "Supabase", "PostgreSQL database with Row-Level Security.")
    System_Ext(redis, "Upstash Redis", "Rate limiting and job queue.")
    System_Ext(resend, "Resend", "Transactional email (verification, approvals, notifications).")
    System_Ext(payments, "JazzCash / EasyPaisa / Stripe", "Payment processing (PKR and international).")

    Rel(user, qalam, "Creates and schedules posts", "HTTPS")
    Rel(reviewer, qalam, "Reviews and approves posts", "HTTPS / Email link")
    Rel(admin, qalam, "Manages users and overrides", "HTTPS (admin panel)")

    Rel(qalam, linkedin, "OAuth login + post publishing + analytics sync", "REST API")
    Rel(qalam, groq, "AI content generation (primary)", "REST API")
    Rel(qalam, gemini, "AI content generation (fallback)", "REST API")
    Rel(qalam, supabase, "All persistent data", "REST / RPC")
    Rel(qalam, redis, "Rate limiting + job queues", "Redis protocol")
    Rel(qalam, resend, "Email delivery", "REST API")
    Rel(qalam, payments, "Subscription billing", "Webhooks")
```

---

## 2. C4 Level 2 — Container

```mermaid
C4Container
    title Qalam — Container Diagram

    Person(user, "User (Creator / Reviewer / Admin)")

    Container_Boundary(app, "Qalam Web App (Next.js 16 — Vercel)") {
        Container(marketing, "Marketing Site", "Next.js RSC", "Landing, pricing, blog, SEO pages, free tools")
        Container(app_shell, "App Shell", "Next.js RSC + Client", "Protected routes: writer, dashboard, calendar, settings, approvals, etc.")
        Container(api, "API Layer", "Next.js Route Handlers (81 routes)", "Auth, content generation, posts CRUD, LinkedIn, voice, approvals, admin")
        Container(auth_server, "Auth Server", "NextAuth v5 (JWT)", "LinkedIn OAuth + email/password. Session in signed cookie.")
    }

    ContainerDb(db, "Supabase PostgreSQL", "Database", "Users, workspaces, posts, post_versions, voice_profiles, carousels, approvals, plan_usage, payments, audit_log. RLS enforced.")
    ContainerDb(cache, "Upstash Redis", "Cache + Queue", "Sliding-window rate limits, job queue for LinkedIn publishing")

    System_Ext(linkedin, "LinkedIn API")
    System_Ext(groq, "Groq API")
    System_Ext(gemini, "Google Gemini")
    System_Ext(resend, "Resend Email")
    System_Ext(payments_ext, "Payment Providers")

    Rel(user, marketing, "Browses marketing site", "HTTPS")
    Rel(user, app_shell, "Uses app features", "HTTPS")
    Rel(app_shell, api, "Calls API routes", "fetch() over HTTPS")
    Rel(marketing, api, "Free tool API calls", "fetch() over HTTPS")
    Rel(api, auth_server, "Validates sessions", "NextAuth.auth()")
    Rel(api, db, "CRUD operations, RPC calls", "Supabase REST + RPC")
    Rel(api, cache, "Rate check + job enqueue", "Upstash REST")
    Rel(api, groq, "LLM generation (primary)", "REST")
    Rel(api, gemini, "LLM generation (fallback)", "REST")
    Rel(api, linkedin, "OAuth + publish + sync", "REST")
    Rel(api, resend, "Approval + verification emails", "REST")
    Rel(api, payments_ext, "Webhook verification", "HTTPS webhook")
    Rel(auth_server, linkedin, "OAuth flow", "OAuth 2.0")
```

---

## 3. C4 Level 3 — Component (App Shell)

```mermaid
C4Component
    title Qalam — App Shell Components

    Container_Boundary(shell, "App Shell (Next.js App Router)") {
        Component(root_layout, "Root Layout", "app/layout.tsx", "Global metadata, JSON-LD schema.org, Google/Bing verification, font loading")
        Component(app_layout, "App Layout", "app/(app)/layout.tsx", "Auth gate, AppShell (sidebar + top nav), workspace context providers")

        Component(wp, "WorkspaceProvider", "components/providers/WorkspaceProvider.tsx", "Global state: posts, billing, profile, agency. Will split into PostsContext + ProfileContext + AgencyContext.")
        Component(auth_panel, "AuthSlidePanel", "components/providers/AuthSlidePanel.tsx", "Modal for sign-in flow from marketing pages")
        Component(plan_gate, "PlanGate / LockedFeature", "components/PlanGate.tsx + LockedFeature.tsx", "UI guard: shows upgrade prompt if user lacks required plan")

        Component(writer, "Writer Page", "app/(app)/writer/page.tsx", "AI post generation, scoring, hooks, scheduling. Largest feature (target: split into 5 sub-components)")
        Component(dashboard, "Dashboard", "app/(app)/dashboard/DashboardClient.tsx", "Stats, recent posts, usage counters")
        Component(calendar, "Calendar", "app/(app)/calendar/page.tsx", "Scheduled posts grid, drag-and-drop rescheduling")
        Component(settings, "Settings", "app/(app)/settings/page.tsx", "Profile, billing, LinkedIn connection, account")
        Component(approvals, "Approvals", "app/(app)/approvals/page.tsx", "Approval queue, approve/reject workflow")
        Component(analytics, "Analytics", "app/(app)/analytics/page.tsx", "Usage metrics, post performance")
        Component(library, "Library", "app/(app)/library/page.tsx", "Post archive, search, filter")
        Component(voice, "Voice Profile", "app/(app)/voice/page.tsx", "Voice training, example posts")
        Component(admin, "Admin Dashboard", "app/admin/AdminDashboard.tsx", "User management, plan overrides, audit logs")
        Component(carousel_ui, "Carousel Builder", "components/tools/CarouselBuilderTool.tsx", "Slide editor, PDF export")
    }

    Rel(app_layout, wp, "Mounts and provides")
    Rel(app_layout, plan_gate, "Wraps protected pages")
    Rel(writer, wp, "useWorkspace() — posts, billing, mutations")
    Rel(dashboard, wp, "useWorkspace() — posts, usage")
    Rel(calendar, wp, "useWorkspace() — scheduled posts")
    Rel(settings, wp, "useWorkspace() — profile, billing")
    Rel(approvals, wp, "useWorkspace() — posts context")
```

---

## 4. C4 Level 4 — Code (Generate Post Flow)

```mermaid
C4Code
    title Generate Post — Code Level

    Component(writer_editor, "WriterEditor.tsx", "React component", "Form inputs: topic, role, format. Calls usePostGeneration hook.")
    Component(use_gen, "usePostGeneration", "lib/hooks/usePostGeneration.ts", "useState for isGenerating, score, hooks. Calls /api/generate via fetch.")
    Component(api_gen, "POST /api/generate", "app/api/generate/route.ts", "Thin handler: auth → parse → call use-case → serialize")
    Component(uc_gen, "generatePost()", "lib/use-cases/generate-post.ts", "Orchestrates: check limit → fetch voice → generate → score → increment usage. Returns Result<GeneratedPost>.")
    Component(plan_limits, "PlanLimitsAdapter", "lib/server/plan-limits-v2.ts", "Implements PlanLimitsPort. Calls DB RPC get_or_create_plan_usage and increment_plan_usage.")
    Component(content_gen, "ContentGeneratorAdapter", "lib/server/content-generator.ts", "3-pass pipeline: generate → humanize → score. Implements ContentGeneratorPort.")
    Component(ai_router, "AIRouterV2", "lib/server/ai-router-v2.ts", "Routes to Groq (primary) or Gemini (fallback). Circuit breaker. Queue.")
    Component(supa_rest, "supabaseSelect/Insert", "lib/server/supabase-rest.ts", "REST wrapper for Supabase. Returns typed arrays.")
    Component(db_plan, "plan_usage table", "Supabase DB", "Tracks monthly usage per user. RLS: user can only see own row.")
    Component(db_voice, "voice_profiles table", "Supabase DB", "Stores voice profile per workspace.")
    Component(groq_api, "Groq API", "External", "LLM inference endpoint.")

    Rel(writer_editor, use_gen, "generate(params)")
    Rel(use_gen, api_gen, "POST /api/generate")
    Rel(api_gen, uc_gen, "generatePost(input, deps)")
    Rel(uc_gen, plan_limits, "check() + increment()")
    Rel(uc_gen, content_gen, "generate()")
    Rel(plan_limits, supa_rest, "RPC calls")
    Rel(content_gen, ai_router, "complete(prompt, params)")
    Rel(ai_router, groq_api, "POST /openai/v1/chat/completions")
    Rel(supa_rest, db_plan, "REST GET + PATCH")
    Rel(supa_rest, db_voice, "REST GET")
```

---

## 5. Sequence Diagrams — Critical User Journeys

### 5.1 New User Signup via LinkedIn OAuth

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Next as Next.js App
    participant NextAuth
    participant LinkedIn as LinkedIn OAuth
    participant DB as Supabase DB
    participant Email as Resend

    User->>Browser: Visit byqalam.com
    Browser->>Next: GET /
    Next-->>Browser: Marketing homepage (RSC)
    User->>Browser: Click "Start Free" → /signup
    Browser->>Next: GET /signup
    Next-->>Browser: Signup page
    User->>Browser: Click "Continue with LinkedIn"
    Browser->>NextAuth: signIn("linkedin")
    NextAuth->>LinkedIn: Redirect to LinkedIn auth
    LinkedIn-->>User: Authorization prompt
    User->>LinkedIn: Authorize Qalam
    LinkedIn->>NextAuth: Callback with code
    NextAuth->>LinkedIn: Exchange code for tokens
    LinkedIn-->>NextAuth: access_token, profile {sub, email, name}
    NextAuth->>DB: SELECT users WHERE external_user_id = sub
    DB-->>NextAuth: null (new user)
    NextAuth->>DB: INSERT users {external_user_id, email, name, plan: "free"}
    NextAuth->>DB: INSERT workspaces {owner_id, name: "My Workspace"}
    NextAuth->>DB: INSERT workspace_members {user_id, role: "owner"}
    NextAuth->>DB: INSERT plan_usage {user_id, plan: "free", ai_drafts_used: 0}
    DB-->>NextAuth: user created
    NextAuth->>NextAuth: Create JWT {id, email, name, provider: "linkedin"}
    NextAuth-->>Browser: Set session cookie + redirect to /dashboard
    Browser->>Next: GET /dashboard
    Next->>DB: Load workspace + posts + usage
    DB-->>Next: workspace data
    Next-->>Browser: Dashboard (empty state, welcome UI)
    Browser-->>User: Dashboard visible
```

### 5.2 AI Post Generation (Full Happy Path)

```mermaid
sequenceDiagram
    actor Creator
    participant WriterPage as Writer Page
    participant API as /api/generate
    participant Limits as plan-limits-v2
    participant Gen as content-generator
    participant AI as ai-router-v2
    participant Groq as Groq API
    participant DB as Supabase

    Creator->>WriterPage: Enter topic "AI in HR" + role "HR" + format "Medium"
    Creator->>WriterPage: Click "Generate"
    WriterPage->>API: POST /api/generate {topic, role, format, workspaceId}
    API->>Limits: check(userId, "ai_drafts")
    Limits->>DB: SELECT plan_usage WHERE user_id = userId
    DB-->>Limits: {ai_drafts_used: 2, limit: 5}
    Limits-->>API: ok (2 < 5)
    API->>DB: SELECT voice_profiles WHERE workspace_id = workspaceId
    DB-->>API: voiceProfile {tone_distribution, top_phrases}
    API->>Gen: generate(topic, role, format, voiceProfile)

    Note over Gen,Groq: Pass 1 — Generate
    Gen->>AI: complete(buildGeneratePrompt(topic, role, voiceProfile))
    AI->>Groq: POST /chat/completions {model: llama-3.1-8b, messages, temp: 0.85}
    Groq-->>AI: raw post text
    AI-->>Gen: raw post

    Note over Gen,Groq: Pass 2 — Humanize
    Gen->>AI: complete(buildHumanizePrompt(rawPost))
    AI->>Groq: POST /chat/completions {temp: 0.4}
    Groq-->>AI: humanized post
    AI-->>Gen: humanized post

    Note over Gen,Groq: Pass 3 — Score
    Gen->>AI: complete(buildScorePrompt(humanizedPost))
    AI->>Groq: POST /chat/completions
    Groq-->>AI: score JSON {overall: 84, hooks: 78, cta: 90, tips: [...]}
    AI-->>Gen: score
    Gen-->>API: {content, score, hashtags, hooks}

    API->>Limits: increment(userId, "ai_drafts")
    Limits->>DB: RPC increment_plan_usage(userId, "ai_drafts_used")
    DB-->>Limits: ok
    API-->>WriterPage: 200 {content, score, hashtags, hooks}
    WriterPage-->>Creator: Generated post + score breakdown shown
```

### 5.3 Post Approval Workflow

```mermaid
sequenceDiagram
    actor Editor
    actor Reviewer
    participant WriterPage as Writer Page
    participant ApprovalsAPI as /api/approvals
    participant ApprovalPage as /approvals/[id]/review
    participant DB as Supabase
    participant Email as Resend

    Editor->>WriterPage: Finish post → "Send for Approval"
    WriterPage->>ApprovalsAPI: POST /api/approvals {postId, reviewerEmail}
    ApprovalsAPI->>DB: INSERT approvals {postId, status: "pending", reviewerEmail}
    ApprovalsAPI->>Email: sendApprovalEmail(reviewerEmail, approvalLink)
    Email-->>Reviewer: "A post needs your review" email
    ApprovalsAPI-->>WriterPage: 201 {approvalId}
    WriterPage-->>Editor: "Sent for review" toast

    Reviewer->>Email: Click "Review Post" link
    Email->>ApprovalPage: GET /approvals/{id}/review
    ApprovalPage->>DB: SELECT approvals JOIN posts WHERE approval.id = id
    DB-->>ApprovalPage: {post content, approvalId, reviewerEmail}
    ApprovalPage-->>Reviewer: Post preview + Approve/Reject buttons

    alt Reviewer approves
        Reviewer->>ApprovalPage: Click "Approve"
        ApprovalPage->>ApprovalsAPI: POST /api/approvals/{id}/approve
        ApprovalsAPI->>DB: UPDATE approvals SET status="approved"
        ApprovalsAPI->>DB: UPDATE posts SET status="scheduled" (or "published")
        ApprovalsAPI->>Email: notifyEditor("Your post was approved")
        ApprovalsAPI-->>ApprovalPage: 200
        ApprovalPage-->>Reviewer: "Post approved" confirmation
        Email-->>Editor: "Your post was approved" email
    else Reviewer rejects
        Reviewer->>ApprovalPage: Click "Reject" + add note
        ApprovalPage->>ApprovalsAPI: POST /api/approvals/{id}/reject {note}
        ApprovalsAPI->>DB: UPDATE approvals SET status="rejected", rejection_note=note
        ApprovalsAPI->>DB: UPDATE posts SET status="draft"
        ApprovalsAPI->>Email: notifyEditor("Your post needs revision", note)
        ApprovalsAPI-->>ApprovalPage: 200
        Email-->>Editor: "Post rejected" email with note
    end
```

### 5.4 LinkedIn Scheduled Publishing

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron (every 5 min)
    participant PublishAPI as /api/linkedin/publish-scheduled
    participant LICreds as linkedin-credentials
    participant LI as LinkedIn API
    participant DB as Supabase

    Cron->>PublishAPI: POST (cron trigger)
    PublishAPI->>DB: SELECT posts WHERE status="scheduled" AND scheduledAt <= NOW()
    DB-->>PublishAPI: [{postId, workspaceId, content, ...}, ...]

    loop For each due post
        PublishAPI->>LICreds: getCredentials(workspaceId)
        LICreds->>DB: SELECT linkedin_credentials WHERE workspace_id=workspaceId
        DB-->>LICreds: {access_token, refresh_token, expires_at}
        alt Token expired
            LICreds->>LI: POST /oauth/v2/accessToken (refresh)
            LI-->>LICreds: new access_token
            LICreds->>DB: UPDATE linkedin_credentials SET access_token=...
        end
        PublishAPI->>LI: POST /ugcPosts (content, authorUrn, visibility: PUBLIC)
        LI-->>PublishAPI: {id: "urn:li:ugcPost:123"}
        PublishAPI->>DB: UPDATE posts SET status="published", linkedin_post_id="urn:li:ugcPost:123", published_at=NOW()
        PublishAPI->>DB: INSERT audit_log {action: "auto_published", post_id: ...}
    end

    PublishAPI-->>Cron: 200 {published: n, failed: m}
```

### 5.5 Admin Plan Override

```mermaid
sequenceDiagram
    actor Admin
    participant AdminPanel as /admin
    participant AdminAPI as /api/admin/overrides
    participant DB as Supabase
    participant AuditLog as audit_log table

    Admin->>AdminPanel: Navigate to /admin
    AdminPanel->>DB: Verify ADMIN_EMAILS contains session email
    DB-->>AdminPanel: Admin confirmed
    AdminPanel-->>Admin: Admin dashboard

    Admin->>AdminPanel: Search user by email
    AdminPanel->>AdminAPI: GET /api/admin/users?email=user@example.com
    AdminAPI->>DB: SELECT users WHERE email=...
    DB-->>AdminAPI: user data
    AdminAPI-->>AdminPanel: user {id, email, plan, usage}

    Admin->>AdminPanel: Set override: plan="pro", expires="2026-12-31"
    AdminPanel->>AdminAPI: POST /api/admin/overrides {userId, plan_override: "pro", expires_at}
    AdminAPI->>DB: UPSERT user_overrides {user_id, plan_override, expires_at}
    AdminAPI->>AuditLog: INSERT {admin_email, target_user_email, action: "plan_override", new_value: "pro"}
    DB-->>AdminAPI: ok
    AdminAPI-->>AdminPanel: 200
    AdminPanel-->>Admin: "Override applied" toast
```

---

## 6. Module Dependency Matrix

> `●` = direct dependency  `○` = transitive dependency  `—` = no dependency

| Module | domain | use-cases | lib/hooks | lib/server | app/api | components | app/(app) |
|--------|:------:|:---------:|:---------:|:----------:|:-------:|:----------:|:---------:|
| **domain** | — | — | — | — | — | — | — |
| **use-cases** | ● | — | — | — | — | — | — |
| **lib/hooks** | ● | ● | — | — | — | — | — |
| **lib/server** | ● | ○ | — | — | — | — | — |
| **app/api** | ● | ● | — | ● | — | — | — |
| **components** | ● | ○ | ● | — | — | — | — |
| **app/(app)** | ○ | ○ | ● | — | — | ● | — |

**Reading:** Rows depend on columns. `●` in `app/api` × `lib/server` means API routes directly depend on server utilities.

**Key constraint:** `components` row has no `●` in `lib/server` — client components never import server code.

---

## 7. Database Schema Map

```mermaid
erDiagram
    users {
        uuid id PK
        string external_user_id
        string email
        string name
        string password_hash
        string plan
        string avatar_url
        timestamp created_at
    }
    workspaces {
        uuid id PK
        uuid owner_id FK
        string name
        string slug
        timestamp created_at
    }
    workspace_members {
        uuid workspace_id FK
        uuid user_id FK
        string role
    }
    posts {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string title
        text content
        string status
        timestamp scheduled_at
        timestamp published_at
        string linkedin_post_id
        jsonb metadata
        timestamp created_at
    }
    post_versions {
        uuid id PK
        uuid post_id FK
        int version_number
        text content
        uuid created_by FK
        timestamp created_at
    }
    voice_profiles {
        uuid id PK
        uuid workspace_id FK
        int example_count
        jsonb tone_distribution
        jsonb top_phrases
        timestamp updated_at
    }
    carousels {
        uuid id PK
        uuid workspace_id FK
        string title
        jsonb slides
        timestamp created_at
    }
    approvals {
        uuid id PK
        uuid post_id FK
        uuid workspace_id FK
        string status
        string reviewer_email
        string rejection_note
        timestamp reviewed_at
    }
    client_workspaces {
        uuid id PK
        uuid agency_team_id FK
        string client_name
        uuid voice_profile_id FK
        bool approval_required
    }
    plan_usage {
        uuid id PK
        uuid user_id FK
        string plan
        int ai_drafts_used
        int carousels_used
        int hooks_used
        int analyses_used
        timestamp cycle_end
    }
    user_overrides {
        uuid user_id FK
        string plan_override
        int draft_limit_override
        jsonb feature_flags
        timestamp expires_at
    }
    organizations {
        uuid id PK
        string plan
        string subscription_status
        timestamp plan_expires_at
    }
    payments {
        uuid id PK
        string provider
        uuid user_id FK
        int amount
        string currency
        string plan
        string transaction_id
        string status
    }
    audit_log {
        uuid id PK
        string admin_email
        string target_user_email
        string action
        string old_value
        string new_value
        timestamp created_at
    }

    users ||--o{ workspaces : "owns"
    users ||--o{ workspace_members : "member_of"
    workspaces ||--o{ workspace_members : "has"
    workspaces ||--o{ posts : "contains"
    workspaces ||--o{ voice_profiles : "has"
    workspaces ||--o{ carousels : "has"
    workspaces ||--o{ approvals : "has"
    posts ||--o{ post_versions : "has_versions"
    posts ||--|| approvals : "approval_for"
    users ||--|| plan_usage : "has_usage"
    users ||--o| user_overrides : "may_have_override"
    users ||--o{ payments : "made"
```

---

## 8. Infrastructure Architecture

```mermaid
graph TB
    subgraph VERCEL["Vercel Edge Network"]
        direction TB
        EDGE[Edge Runtime - CSP / HSTS / Image Optimization]
        NODE[Node.js Runtime - API Routes / Server Components]
        CRON[Vercel Cron - /api/linkedin/publish-scheduled every 5 min]
    end

    subgraph DATA["Data Layer"]
        SUPA[(Supabase PostgreSQL\nRLS enforced\nPostgREST REST API\n12 tables, 9+ migrations)]
        REDIS[(Upstash Redis\nRate limits\nJob queue)]
    end

    subgraph AI["AI Layer"]
        GROQ[Groq API\nllama-3.1-8b-instant\nprimary]
        GEMINI[Google Gemini\nfallback]
        CB[Circuit Breaker\nper-provider]
    end

    subgraph COMM["Communication Layer"]
        LI_API[LinkedIn REST API\nOAuth 2.0 + UGC Posts]
        RESEND[Resend\nTransactional Email]
        PAY[JazzCash / EasyPaisa / Stripe\nWebhook-based]
    end

    EDGE --> NODE
    NODE --> SUPA
    NODE --> REDIS
    NODE --> CB
    CB --> GROQ
    CB --> GEMINI
    NODE --> LI_API
    NODE --> RESEND
    NODE --> PAY
    CRON --> NODE
```

---

## 9. Authentication State Machine

```mermaid
stateDiagram-v2
    [*] --> Anonymous: First visit
    Anonymous --> EmailSignup: POST /api/auth/signup
    Anonymous --> LinkedInOAuth: signIn("linkedin")
    EmailSignup --> PendingVerification: Email sent
    PendingVerification --> Authenticated: GET /api/auth/verify-email?token=...
    LinkedInOAuth --> Authenticated: OAuth callback → provisionOAuthUser()
    Authenticated --> [*]: signOut()
    Authenticated --> Authenticated: Token refresh (30-day JWT max age)

    state Authenticated {
        [*] --> FreeUser
        FreeUser --> SoloUser: Payment webhook (solo plan)
        SoloUser --> ProUser: Payment webhook (pro plan)
        ProUser --> AgencyUser: Payment webhook (agency plan)
        ProUser --> AdminUser: Email in ADMIN_EMAILS env var
        FreeUser --> OverriddenUser: Admin sets user_override
        SoloUser --> OverriddenUser: Admin sets user_override
    }
```

---

## 10. Plan Feature Availability Matrix

```mermaid
graph LR
    subgraph FREE["Free (0 PKR/mo)"]
        F1[5 posts/month]
        F2[1 carousel]
        F3[5 hooks]
        F4[5 analyses]
        F5[Basic voice profile]
    end

    subgraph SOLO["Solo (499 PKR/mo)"]
        S1[30 posts/month]
        S2[3 carousels]
        S3[30 hooks]
        S4[10 analyses]
        S5[LinkedIn publishing]
        S6[Scheduling]
        S7[Post library]
    end

    subgraph PRO["Pro (1490 PKR/mo)"]
        P1[60 posts/month]
        P2[10 carousels]
        P3[60 hooks]
        P4[20 analyses]
        P5[Advanced voice training]
        P6[Analytics dashboard]
        P7[Competitor research]
        P8[Carousel themes + branding]
        P9[Chat strategist]
    end

    subgraph AGENCY["Agency (7490 PKR/mo - coming soon)"]
        A1[300 posts/month]
        A2[50 carousels]
        A3[5 workspaces]
        A4[Team members]
        A5[Client workspaces]
        A6[Approval workflows]
        A7[White-label export]
    end

    FREE --> SOLO
    SOLO --> PRO
    PRO --> AGENCY
```

---

## Self-Check Answers

| Question | Answer |
|----------|--------|
| Can a new hire understand the system in 30 min from `/architecture/`? | **Yes** — C4 maps show scope; audit shows current sins; migration plan shows path |
| Can I delete the UI layer and business logic still runs in tests? | **After migration: Yes** — use-cases in `lib/use-cases/` have zero React deps; test with mocked ports |
| Can I swap Supabase for another DB by changing only the infrastructure layer? | **Yes** — after migration, all DB calls go through `PostRepositoryPort` (interface). Implement a new adapter. |
| Does every file have exactly one reason to change? | **No (current), Yes (target)** — migration plan eliminates the god files |
| Would Uncle Bob, Eric Evans, and Martin Fowler sign off? | **On target architecture: Yes.** On current state: No. |
| Can each migration PR ship without users noticing? | **Yes** — every step is additive or purely internal refactor |
| Is there a feature flag strategy for risky moves? | **Yes** — Step 9 in migration plan documents `NEXT_PUBLIC_USE_SPLIT_CONTEXT` flag |
| Are there any hot files needing extra coordination? | **Yes** — `writer/page.tsx` (1544L), `WorkspaceProvider.tsx` (491L), `generate/route.ts` (246L). These need PR review from two people minimum. |
