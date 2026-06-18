-- ================================================================
-- schema_final.sql — Qalam Production Schema
-- ================================================================
-- Single authoritative file. Run on a clean Supabase project.
-- Fixes all issues found in the incremental migration sequence:
--   • Correct user-scoped RLS (no USING(true) on user data)
--   • workspaces.owner_email present
--   • Duplicate/obsolete migration files superseded
--   • Consistent plan values across all tables
--   • pgvector support (conditional on extension being enabled)
--   • All RPCs / triggers in one place
-- ================================================================

-- ----------------------------------------------------------------
-- 0. Drop orphaned tables from failed/partial previous runs
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.analytics_snapshots    CASCADE;
DROP TABLE IF EXISTS public.linkedin_credentials   CASCADE;
DROP TABLE IF EXISTS public.posts                  CASCADE;
DROP TABLE IF EXISTS public.workspaces             CASCADE;
DROP TABLE IF EXISTS public.agency_clients         CASCADE;
-- Also drop any other leftover tables
DROP TABLE IF EXISTS public.users                  CASCADE;
DROP TABLE IF EXISTS public.organizations          CASCADE;
DROP TABLE IF EXISTS public.workspace_members      CASCADE;
DROP TABLE IF EXISTS public.plan_usage             CASCADE;
DROP TABLE IF EXISTS public.plan_audit_log         CASCADE;
DROP TABLE IF EXISTS public.user_overrides         CASCADE;
DROP TABLE IF EXISTS public.admin_audit_log        CASCADE;
DROP TABLE IF EXISTS public.payments               CASCADE;
DROP TABLE IF EXISTS public.post_versions          CASCADE;
DROP TABLE IF EXISTS public.carousels              CASCADE;
DROP TABLE IF EXISTS public.carousel_projects      CASCADE;
DROP TABLE IF EXISTS public.carousel_slides        CASCADE;
DROP TABLE IF EXISTS public.voice_profiles         CASCADE;
DROP TABLE IF EXISTS public.voice_training_logs    CASCADE;
DROP TABLE IF EXISTS public.voice_examples         CASCADE;
DROP TABLE IF EXISTS public.conversations          CASCADE;
DROP TABLE IF EXISTS public.conversation_messages  CASCADE;
DROP TABLE IF EXISTS public.competitor_analyses    CASCADE;
DROP TABLE IF EXISTS public.approvals              CASCADE;
DROP TABLE IF EXISTS public.password_resets        CASCADE;
DROP TABLE IF EXISTS public.email_verifications    CASCADE;
DROP TABLE IF EXISTS public.ai_usage               CASCADE;
DROP TABLE IF EXISTS public.scheduling_notifications CASCADE;
DROP TABLE IF EXISTS public.rate_limits            CASCADE;
-- Legacy tables
DROP TABLE IF EXISTS public.memberships            CASCADE;
DROP TABLE IF EXISTS public.user_workspace         CASCADE;
DROP TABLE IF EXISTS public.post_variants          CASCADE;
DROP TABLE IF EXISTS public.messages               CASCADE;
DROP TABLE IF EXISTS public.jobs                   CASCADE;
DROP TABLE IF EXISTS public.analytics_events       CASCADE;
DROP TABLE IF EXISTS public.notifications          CASCADE;
DROP TABLE IF EXISTS public.publish_logs           CASCADE;
DROP TABLE IF EXISTS public.publishing_accounts    CASCADE;
DROP TABLE IF EXISTS public.plan_audit_log         CASCADE;

-- ----------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 2. CORE USER TABLES
-- ================================================================

CREATE TABLE public.users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        UNIQUE NOT NULL,
  full_name         TEXT,
  image_url         TEXT,
  plan              TEXT        NOT NULL DEFAULT 'Free'
                    CHECK (plan IN ('Free','Solo','Pro','Agency','Agency Starter','Agency Growth')),
  plan_expires_at   TIMESTAMPTZ,
  session_version   INTEGER     NOT NULL DEFAULT 1,
  external_user_id  TEXT        UNIQUE,
  password_hash     TEXT,
  email_verified    BOOLEAN     NOT NULL DEFAULT false,
  auth_provider     TEXT        NOT NULL DEFAULT 'linkedin',
  role              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.organizations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  plan                TEXT        NOT NULL DEFAULT 'Free'
                      CHECK (plan IN ('Free','Solo','Pro','Agency','Agency Starter','Agency Growth')),
  subscription_status TEXT        NOT NULL DEFAULT 'active'
                      CHECK (subscription_status IN ('active','trialing','past_due','canceled','paused')),
  plan_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_expires_at     TIMESTAMPTZ,
  customer_id         TEXT        UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workspaces (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT,
  owner_id        TEXT,
  owner_email     TEXT,
  slug            TEXT,
  industry        TEXT,
  linkedin_url    TEXT,
  notes           TEXT,
  tone            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'owner'
               CHECK (role IN ('owner','admin','editor','viewer','client_reviewer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- ================================================================
-- 3. BILLING TABLES
-- ================================================================

CREATE TABLE public.plan_usage (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT        NOT NULL UNIQUE,
  plan                 TEXT        NOT NULL DEFAULT 'free',
  ai_drafts_used       INTEGER     NOT NULL DEFAULT 0,
  carousels_used       INTEGER     NOT NULL DEFAULT 0,
  hooks_used           INTEGER     NOT NULL DEFAULT 0,
  analyses_used        INTEGER     NOT NULL DEFAULT 0,
  competitor_runs_used INTEGER     NOT NULL DEFAULT 0,
  cycle_start          TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_end            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_uuid            UUID        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.plan_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  changed_by      TEXT,
  old_plan        TEXT,
  new_plan        TEXT,
  old_status      TEXT,
  new_status      TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_overrides (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  TEXT        NOT NULL UNIQUE,
  plan_override            TEXT        CHECK (plan_override IN ('Free','Solo','Pro','Agency')),
  draft_limit_override     INTEGER,
  workspace_limit_override INTEGER,
  feature_flags            JSONB       NOT NULL DEFAULT '{}',
  notes                    TEXT,
  expires_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email       TEXT        NOT NULL,
  target_user_email TEXT        NOT NULL,
  action            TEXT        NOT NULL,
  old_value         JSONB,
  new_value         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT         NOT NULL CHECK (provider IN ('stripe','jazzcash','easypaisa')),
  transaction_id TEXT         NOT NULL,
  user_id        UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT         NOT NULL DEFAULT 'PKR',
  plan_name      TEXT         NOT NULL
                 CHECK (plan_name IN ('Free','Solo','Pro','Agency','Agency Starter','Agency Growth')),
  billing_cycle  TEXT         NOT NULL DEFAULT 'monthly'
                 CHECK (billing_cycle IN ('monthly','annual')),
  status         TEXT         NOT NULL CHECK (status IN ('paid','failed','cancelled')),
  raw_payload    JSONB        NOT NULL DEFAULT '{}',
  processed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (provider, transaction_id)
);

-- ================================================================
-- 4. CONTENT TABLES
-- ================================================================

CREATE TABLE public.linkedin_credentials (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  access_token     TEXT        NOT NULL,
  member_id        TEXT,
  token_expires_at BIGINT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  workspace_id     UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title            TEXT,
  content          TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','pending_approval','approved','rejected',
                                     'scheduled','notified','published','failed','archived')),
  hook             TEXT,
  cta              TEXT,
  role_profile     TEXT,
  topic            TEXT,
  engagement_score INTEGER,
  scheduled_for    TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  linkedin_post_id TEXT,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.post_versions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id            UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  version_number     INTEGER     NOT NULL,
  content            TEXT        NOT NULL DEFAULT '',
  change_summary     TEXT,
  engagement_score   INTEGER,
  edit_delta_percent FLOAT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, version_number)
);

-- ================================================================
-- 5. CAROUSEL TABLES
-- ================================================================

-- Simple carousel (direct JSON slides — used by /api/carousel)
CREATE TABLE public.carousels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  topic       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'Founder',
  tone        TEXT,
  slide_count INTEGER     NOT NULL DEFAULT 7,
  slides      JSONB       NOT NULL DEFAULT '[]',
  theme       TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Structured carousel projects (multi-slide editor)
CREATE TABLE public.carousel_projects (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  workspace_id UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  topic        TEXT,
  role_profile TEXT,
  status       TEXT        NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','published','archived')),
  pdf_url      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.carousel_slides (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES public.carousel_projects(id) ON DELETE CASCADE,
  slide_number INTEGER     NOT NULL,
  title        TEXT,
  content      TEXT        NOT NULL,
  image_prompt TEXT,
  layout       TEXT        NOT NULL DEFAULT 'default',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 6. VOICE TABLES
-- ================================================================

CREATE TABLE public.voice_profiles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL UNIQUE,
  workspace_id    UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,
  role            TEXT        NOT NULL DEFAULT 'general',
  display_name    TEXT,
  sample_posts    JSONB       NOT NULL DEFAULT '[]',
  voice_fingerprint JSONB     NOT NULL DEFAULT '{}',
  explicit_rules  JSONB       NOT NULL DEFAULT '{}',
  characteristics JSONB       NOT NULL DEFAULT '{}',
  name            TEXT,
  title           TEXT,
  industry        TEXT,
  linkedin_url    TEXT,
  brand_tone      TEXT,
  goals           TEXT,
  example_posts   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voice_training_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  sample_text TEXT        NOT NULL,
  ai_analysis JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voice_examples (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(content) >= 10),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 7. CONVERSATION TABLES
-- ================================================================

CREATE TABLE public.conversations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  title        TEXT,
  role_context TEXT        NOT NULL DEFAULT 'general',
  status       TEXT        NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT        NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 8. AGENCY / APPROVAL TABLES
-- ================================================================

CREATE TABLE public.agency_clients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_email TEXT        NOT NULL,
  client_name  TEXT        NOT NULL,
  client_email TEXT,
  status       TEXT        NOT NULL DEFAULT 'active',
  plan         TEXT        NOT NULL DEFAULT 'Standard',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.competitor_analyses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  post_text           TEXT        NOT NULL,
  post_url            TEXT,
  hook_structure      JSONB,
  engagement_factors  JSONB,
  content_pattern     JSONB,
  improvements        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.approvals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID,
  requester_id      TEXT        NOT NULL,
  reviewer_email    TEXT        NOT NULL,
  post_title        TEXT,
  post_content      TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  message           TEXT,
  comment           TEXT,
  review_token_hash TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 9. AUTH / SECURITY TABLES
-- ================================================================

CREATE TABLE public.password_resets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_verifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 10. ANALYTICS / TRACKING TABLES
-- ================================================================

CREATE TABLE public.ai_usage (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  provider           TEXT        NOT NULL CHECK (provider IN ('groq','gemini')),
  model              TEXT        NOT NULL,
  tokens_in          INTEGER     NOT NULL DEFAULT 0,
  tokens_out         INTEGER     NOT NULL DEFAULT 0,
  estimated_cost_usd FLOAT       NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.scheduling_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  email       TEXT,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analytics_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        UUID        REFERENCES public.posts(id) ON DELETE SET NULL,
  workspace_id   UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  impressions    INTEGER     NOT NULL DEFAULT 0,
  reactions      INTEGER     NOT NULL DEFAULT 0,
  comments       INTEGER     NOT NULL DEFAULT 0,
  reposts        INTEGER     NOT NULL DEFAULT 0,
  follower_delta INTEGER     NOT NULL DEFAULT 0,
  notes          TEXT,
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 11. UTILITY TABLES
-- ================================================================

CREATE TABLE public.rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_usage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_overrides          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_credentials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_slides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_training_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_examples          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analyses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits             ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 13. RLS POLICIES
-- service_role bypasses RLS automatically — policies here govern
-- anon / authenticated direct Supabase client access only.
-- All app routes use service_role key, so RLS is a safety net.
-- ================================================================

-- users: own row only
CREATE POLICY "users_own_row" ON public.users
  FOR ALL USING (
    id::text = auth.uid()::text
    OR external_user_id = (SELECT auth.jwt() ->> 'sub')
  );

-- workspaces: members only
CREATE POLICY "workspaces_member_access" ON public.workspaces
  FOR ALL USING (
    owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()::text
    )
  );

-- workspace_members: own membership rows
CREATE POLICY "workspace_members_own" ON public.workspace_members
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- plan_usage: read own usage; writes via service_role only
CREATE POLICY "plan_usage_own_read" ON public.plan_usage
  FOR SELECT USING (user_id = auth.uid()::text);

-- user_overrides: service_role only (admin tool)
CREATE POLICY "user_overrides_service_only" ON public.user_overrides
  USING (false) WITH CHECK (false);

-- admin_audit_log: service_role only
CREATE POLICY "admin_audit_log_service_only" ON public.admin_audit_log
  USING (false) WITH CHECK (false);

-- plan_audit_log: service_role only
CREATE POLICY "plan_audit_log_service_only" ON public.plan_audit_log
  USING (false) WITH CHECK (false);

-- payments: users read their own payment history
CREATE POLICY "payments_own_read" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

-- linkedin_credentials: own row only
CREATE POLICY "linkedin_creds_own" ON public.linkedin_credentials
  FOR ALL USING (user_id = auth.uid());

-- posts: own posts only
CREATE POLICY "posts_own" ON public.posts
  FOR ALL USING (user_id = auth.uid()::text);

-- post_versions: own posts' versions only
CREATE POLICY "post_versions_own" ON public.post_versions
  FOR ALL USING (
    post_id IN (
      SELECT id FROM public.posts WHERE user_id = auth.uid()::text
    )
  );

-- carousels: own carousels only
CREATE POLICY "carousels_own" ON public.carousels
  FOR ALL USING (user_id = auth.uid()::text);

-- carousel_projects: own projects only
CREATE POLICY "carousel_projects_own" ON public.carousel_projects
  FOR ALL USING (user_id = auth.uid()::text);

-- carousel_slides: own project slides only
CREATE POLICY "carousel_slides_own" ON public.carousel_slides
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.carousel_projects WHERE user_id = auth.uid()::text
    )
  );

-- voice_profiles: own profile only
CREATE POLICY "voice_profiles_own" ON public.voice_profiles
  FOR ALL USING (user_id = auth.uid()::text);

-- voice_training_logs: own logs only
CREATE POLICY "voice_training_logs_own" ON public.voice_training_logs
  FOR SELECT USING (user_id = auth.uid()::text);

-- voice_examples: workspace members only
CREATE POLICY "voice_examples_workspace_members" ON public.voice_examples
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

-- conversations: own conversations only
CREATE POLICY "conversations_own" ON public.conversations
  FOR ALL USING (user_id = auth.uid()::text);

-- conversation_messages: own conversation messages only
CREATE POLICY "conversation_messages_own" ON public.conversation_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()::text
    )
  );

-- agency_clients: own agency rows only
CREATE POLICY "agency_clients_own" ON public.agency_clients
  FOR ALL USING (agency_email = auth.jwt() ->> 'email');

-- competitor_analyses: own rows only (FIX: was USING(true))
CREATE POLICY "competitor_analyses_own" ON public.competitor_analyses
  FOR ALL USING (user_id = auth.uid()::text);

-- approvals: requester sees their own requests (FIX: was USING(true))
CREATE POLICY "approvals_requester_own" ON public.approvals
  FOR ALL USING (requester_id = auth.uid()::text);

-- password_resets / email_verifications: service_role only (token secrets)
CREATE POLICY "password_resets_service_only" ON public.password_resets
  USING (false) WITH CHECK (false);

CREATE POLICY "email_verifications_service_only" ON public.email_verifications
  USING (false) WITH CHECK (false);

-- ai_usage: service_role only (internal cost tracking)
CREATE POLICY "ai_usage_service_only" ON public.ai_usage
  USING (false) WITH CHECK (false);

-- scheduling_notifications: service_role only
CREATE POLICY "scheduling_notifications_service_only" ON public.scheduling_notifications
  USING (false) WITH CHECK (false);

-- analytics_snapshots: workspace members read
CREATE POLICY "analytics_snapshots_workspace_members" ON public.analytics_snapshots
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

-- rate_limits: service_role only
CREATE POLICY "rate_limits_service_only" ON public.rate_limits
  USING (false) WITH CHECK (false);

-- organizations: service_role only (provisioned server-side)
CREATE POLICY "organizations_service_only" ON public.organizations
  USING (false) WITH CHECK (false);

-- ================================================================
-- 14. INDEXES
-- ================================================================

-- users
CREATE INDEX idx_users_email              ON public.users (email);
CREATE INDEX idx_users_external_id        ON public.users (external_user_id) WHERE external_user_id IS NOT NULL;

-- workspaces
CREATE INDEX idx_workspaces_owner_id      ON public.workspaces (owner_id);
CREATE INDEX idx_workspaces_org_id        ON public.workspaces (organization_id);

-- workspace_members
CREATE INDEX idx_workspace_members_user   ON public.workspace_members (user_id);
CREATE INDEX idx_workspace_members_ws     ON public.workspace_members (workspace_id);

-- plan_usage
CREATE INDEX idx_plan_usage_user_uuid     ON public.plan_usage (user_uuid);

-- user_overrides
CREATE INDEX idx_user_overrides_user_id   ON public.user_overrides (user_id);
CREATE INDEX idx_user_overrides_expires   ON public.user_overrides (expires_at);

-- admin_audit_log
CREATE INDEX idx_admin_audit_created      ON public.admin_audit_log (created_at DESC);

-- payments
CREATE INDEX idx_payments_user_created    ON public.payments (user_id, created_at DESC);
CREATE INDEX idx_payments_provider_tx     ON public.payments (provider, transaction_id);

-- posts
CREATE INDEX idx_posts_user_id            ON public.posts (user_id);
CREATE INDEX idx_posts_workspace_id       ON public.posts (workspace_id);
CREATE INDEX idx_posts_status             ON public.posts (status);
CREATE INDEX idx_posts_scheduled_for      ON public.posts (scheduled_for) WHERE status = 'scheduled';

-- post_versions
CREATE INDEX idx_post_versions_post_id    ON public.post_versions (post_id);
CREATE INDEX idx_post_versions_created    ON public.post_versions (post_id, created_at DESC);

-- carousels
CREATE INDEX idx_carousels_user_id        ON public.carousels (user_id);
CREATE INDEX idx_carousels_created_at     ON public.carousels (created_at DESC);

-- carousel_projects
CREATE INDEX idx_carousel_projects_user   ON public.carousel_projects (user_id);

-- carousel_slides
CREATE INDEX idx_carousel_slides_project  ON public.carousel_slides (project_id);

-- voice_profiles
CREATE INDEX idx_voice_profiles_user_id   ON public.voice_profiles (user_id);
CREATE INDEX idx_voice_profiles_ws_id     ON public.voice_profiles (workspace_id);

-- voice_examples
CREATE INDEX idx_voice_examples_workspace ON public.voice_examples (workspace_id);
CREATE INDEX idx_voice_examples_user      ON public.voice_examples (user_id);

-- conversations
CREATE INDEX idx_conversations_user_id    ON public.conversations (user_id);
CREATE INDEX idx_conversations_updated    ON public.conversations (updated_at DESC);

-- conversation_messages
CREATE INDEX idx_conv_messages_conv_id    ON public.conversation_messages (conversation_id);

-- agency_clients
CREATE INDEX idx_agency_clients_email     ON public.agency_clients (agency_email);

-- competitor_analyses
CREATE INDEX idx_competitor_user_created  ON public.competitor_analyses (user_id, created_at DESC);

-- approvals
CREATE INDEX idx_approvals_requester      ON public.approvals (requester_id, created_at DESC);
CREATE INDEX idx_approvals_token_hash     ON public.approvals (review_token_hash);

-- password_resets / email_verifications
CREATE INDEX idx_password_resets_token    ON public.password_resets (token_hash);
CREATE INDEX idx_password_resets_user     ON public.password_resets (user_id);
CREATE INDEX idx_email_verif_token        ON public.email_verifications (token_hash);

-- ai_usage
CREATE INDEX idx_ai_usage_user_id         ON public.ai_usage (user_id);
CREATE INDEX idx_ai_usage_created_at      ON public.ai_usage (created_at DESC);

-- scheduling_notifications
CREATE INDEX idx_sched_notif_post_id      ON public.scheduling_notifications (post_id);
CREATE INDEX idx_sched_notif_user_id      ON public.scheduling_notifications (user_id);

-- analytics_snapshots
CREATE INDEX idx_analytics_workspace      ON public.analytics_snapshots (workspace_id, captured_at DESC);
CREATE INDEX idx_analytics_post_id        ON public.analytics_snapshots (post_id);

-- rate_limits
CREATE INDEX idx_rate_limits_key_time     ON public.rate_limits (key, created_at);

-- organizations
CREATE INDEX idx_organizations_plan       ON public.organizations (plan, subscription_status);

-- ================================================================
-- 15. TRIGGER: auto-log org plan changes
-- ================================================================

CREATE OR REPLACE FUNCTION public.fn_track_plan_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan
     OR OLD.subscription_status IS DISTINCT FROM NEW.subscription_status
  THEN
    INSERT INTO public.plan_audit_log
      (organization_id, old_plan, new_plan, old_status, new_status)
    VALUES
      (NEW.id, OLD.plan, NEW.plan, OLD.subscription_status, NEW.subscription_status);
    NEW.plan_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_change ON public.organizations;
CREATE TRIGGER trg_plan_change
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_track_plan_change();

-- ================================================================
-- 16. UTILITY FUNCTIONS
-- ================================================================

-- Maps JWT sub → internal users.id
CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT id FROM public.users
  WHERE external_user_id = (SELECT auth.jwt() ->> 'sub')
  LIMIT 1;
$$;

-- Rate limiting: returns true if request is allowed
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT, p_limit INT, p_window_seconds INT
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE key = p_key
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  IF v_count >= p_limit THEN RETURN false; END IF;

  INSERT INTO public.rate_limits (key, created_at) VALUES (p_key, NOW());
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Monthly AI cost aggregation
CREATE OR REPLACE FUNCTION public.get_monthly_ai_cost(p_user_id UUID)
RETURNS FLOAT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)
  FROM public.ai_usage
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', now());
$$;

-- Next version number for a post (1-based, gapless)
CREATE OR REPLACE FUNCTION public.next_post_version(p_post_id UUID)
RETURNS INTEGER LANGUAGE sql AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM public.post_versions WHERE post_id = p_post_id;
$$;

-- ================================================================
-- 17. PLAN USAGE RPCs
-- ================================================================

CREATE OR REPLACE FUNCTION public.increment_plan_usage(
  p_user_id    TEXT,
  p_field      TEXT,
  p_max_allowed INTEGER
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  current_val  INTEGER;
  updated_rows INTEGER;
BEGIN
  IF p_field NOT IN ('ai_drafts_used','carousels_used','hooks_used','analyses_used','competitor_runs_used') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid_field');
  END IF;

  SELECT CASE p_field
    WHEN 'ai_drafts_used'       THEN ai_drafts_used
    WHEN 'carousels_used'       THEN carousels_used
    WHEN 'hooks_used'           THEN hooks_used
    WHEN 'analyses_used'        THEN analyses_used
    WHEN 'competitor_runs_used' THEN competitor_runs_used
  END INTO current_val
  FROM public.plan_usage WHERE user_id = p_user_id FOR UPDATE;

  IF current_val IS NULL THEN
    INSERT INTO public.plan_usage (user_id, plan)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    current_val := 0;
  END IF;

  IF current_val >= p_max_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'current', current_val, 'limit', p_max_allowed);
  END IF;

  UPDATE public.plan_usage SET
    ai_drafts_used       = CASE WHEN p_field = 'ai_drafts_used'       THEN ai_drafts_used + 1       ELSE ai_drafts_used       END,
    carousels_used       = CASE WHEN p_field = 'carousels_used'       THEN carousels_used + 1       ELSE carousels_used       END,
    hooks_used           = CASE WHEN p_field = 'hooks_used'           THEN hooks_used + 1           ELSE hooks_used           END,
    analyses_used        = CASE WHEN p_field = 'analyses_used'        THEN analyses_used + 1        ELSE analyses_used        END,
    competitor_runs_used = CASE WHEN p_field = 'competitor_runs_used' THEN competitor_runs_used + 1 ELSE competitor_runs_used END,
    updated_at = now()
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'update_failed');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'current', current_val + 1, 'limit', p_max_allowed);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_plan_usage(p_user_id TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE result public.plan_usage%ROWTYPE;
BEGIN
  SELECT * INTO result FROM public.plan_usage WHERE user_id = p_user_id;
  IF result.id IS NULL THEN
    INSERT INTO public.plan_usage (user_id, plan)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO result;
    IF result.id IS NULL THEN
      SELECT * INTO result FROM public.plan_usage WHERE user_id = p_user_id;
    END IF;
  END IF;
  RETURN to_jsonb(result);
END;
$$;

-- ================================================================
-- 18. AUTH / PROVISIONING RPCs
-- ================================================================

-- Atomic user provisioning on first OAuth login (idempotent)
CREATE OR REPLACE FUNCTION public.provision_oauth_user(
  p_external_id TEXT,
  p_email       TEXT,
  p_full_name   TEXT,
  p_image_url   TEXT
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_user_id      UUID;
  v_workspace_id UUID;
BEGIN
  SELECT u.id, wm.workspace_id
  INTO   v_user_id, v_workspace_id
  FROM   public.users u
  LEFT JOIN public.workspace_members wm ON wm.user_id = u.id::text
  WHERE  u.external_user_id = p_external_id
  ORDER  BY wm.created_at DESC NULLS LAST
  LIMIT  1;

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('user_id', v_user_id, 'workspace_id', v_workspace_id);
  END IF;

  v_user_id      := gen_random_uuid();
  v_workspace_id := gen_random_uuid();

  INSERT INTO public.users (
    id, external_user_id, email, full_name, image_url,
    auth_provider, email_verified, plan, created_at, updated_at
  ) VALUES (
    v_user_id, p_external_id, p_email, p_full_name, p_image_url,
    'oauth', true, 'Free', now(), now()
  );

  INSERT INTO public.plan_usage (
    user_id, plan,
    ai_drafts_used, carousels_used, hooks_used, analyses_used, competitor_runs_used,
    cycle_start, cycle_end, user_uuid
  ) VALUES (
    v_user_id::TEXT, 'free',
    0, 0, 0, 0, 0,
    now(), now() + INTERVAL '1 month', v_user_id
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspaces (
    id, name, owner_id, owner_email, slug, created_at, updated_at
  ) VALUES (
    v_workspace_id,
    'My Workspace',
    v_user_id::TEXT,
    p_email,
    'workspace-' || left(p_external_id, 8),
    now(), now()
  );

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id::TEXT, 'owner');

  RETURN jsonb_build_object('user_id', v_user_id, 'workspace_id', v_workspace_id);
END;
$$;

-- Activate paid plan (called from payment webhook)
CREATE OR REPLACE FUNCTION public.activate_plan(
  p_user_id         UUID,
  p_organization_id UUID,
  p_plan_name       TEXT,
  p_expires_at      TIMESTAMPTZ,
  p_customer_id     TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.users
  SET plan = p_plan_name, plan_expires_at = p_expires_at, updated_at = now()
  WHERE id = p_user_id;

  IF p_organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET plan = p_plan_name, subscription_status = 'active',
        plan_expires_at = p_expires_at, customer_id = p_customer_id, updated_at = now()
    WHERE id = p_organization_id;
  END IF;

  INSERT INTO public.plan_usage (user_id, plan, updated_at)
  VALUES (p_user_id::TEXT, lower(p_plan_name), now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan = lower(EXCLUDED.plan), updated_at = now();
END;
$$;

-- ================================================================
-- 19. CONTENT WRITE RPCs
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_post_with_version(
  p_user_id        TEXT,
  p_workspace_id   UUID,
  p_title          TEXT,
  p_content        TEXT,
  p_hook           TEXT,
  p_cta            TEXT,
  p_role_profile   TEXT,
  p_topic          TEXT,
  p_engagement_score INTEGER,
  p_metadata       JSONB,
  p_status         TEXT DEFAULT 'draft'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE new_post_id UUID;
BEGIN
  INSERT INTO public.posts (
    user_id, workspace_id, title, content, hook, cta,
    role_profile, topic, engagement_score, status, metadata
  ) VALUES (
    p_user_id, p_workspace_id, p_title, p_content, p_hook, p_cta,
    p_role_profile, p_topic, p_engagement_score,
    CASE WHEN p_status IN ('draft','published','scheduled','archived') THEN p_status ELSE 'draft' END,
    COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO new_post_id;

  INSERT INTO public.post_versions (post_id, version_number, content, change_summary, engagement_score, created_by)
  VALUES (new_post_id, 1, p_content, 'Initial AI draft', p_engagement_score, p_user_id);

  RETURN new_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_with_version(
  p_post_id      UUID,
  p_workspace_id UUID,
  p_new_content  TEXT,
  p_created_by   TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_old_content TEXT;
  v_version     INTEGER;
  v_delta       FLOAT;
BEGIN
  SELECT content INTO v_old_content
  FROM public.posts
  WHERE id = p_post_id AND (workspace_id = p_workspace_id OR p_workspace_id IS NULL);

  IF v_old_content IS NULL THEN RAISE EXCEPTION 'post_not_found'; END IF;

  IF v_old_content IS DISTINCT FROM p_new_content THEN
    v_version := public.next_post_version(p_post_id);
    v_delta := CASE
      WHEN length(v_old_content) > 0
        THEN abs(length(p_new_content) - length(v_old_content))::FLOAT
             / GREATEST(length(v_old_content), length(p_new_content)) * 100
      ELSE 100
    END;
    INSERT INTO public.post_versions (post_id, content, version_number, edit_delta_percent, created_by)
    VALUES (p_post_id, v_old_content, v_version, v_delta, p_created_by);
  END IF;

  UPDATE public.posts SET content = p_new_content, updated_at = now()
  WHERE id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_carousel_project(
  p_user_id    TEXT,
  p_title      TEXT,
  p_role       TEXT,
  p_slides     JSONB,
  p_workspace_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE project_id UUID;
BEGIN
  INSERT INTO public.carousel_projects (user_id, workspace_id, title, topic, role_profile)
  VALUES (p_user_id, p_workspace_id, p_title, p_title, p_role)
  RETURNING id INTO project_id;

  INSERT INTO public.carousel_slides (project_id, slide_number, title, content, image_prompt)
  SELECT project_id,
    (s ->> 'slide_number')::int,
    s ->> 'title',
    s ->> 'content',
    COALESCE(s ->> 'visual', s ->> 'image_prompt')
  FROM jsonb_array_elements(p_slides) AS s;

  RETURN project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_conversation_with_message(
  p_user_id          TEXT,
  p_title            TEXT,
  p_role_context     TEXT,
  p_message          TEXT,
  p_assistant_message TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE conversation_id UUID;
BEGIN
  INSERT INTO public.conversations (user_id, title, role_context)
  VALUES (p_user_id, p_title, p_role_context)
  RETURNING id INTO conversation_id;

  INSERT INTO public.conversation_messages (conversation_id, role, content)
  VALUES (conversation_id, 'user', p_message);

  IF p_assistant_message IS NOT NULL AND length(trim(p_assistant_message)) > 0 THEN
    INSERT INTO public.conversation_messages (conversation_id, role, content)
    VALUES (conversation_id, 'assistant', p_assistant_message);
  END IF;

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_conversation_turn(
  p_user_id          TEXT,
  p_conversation_id  UUID,
  p_user_message     TEXT,
  p_assistant_message TEXT,
  p_role_context     TEXT,
  p_title            TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND user_id = p_user_id
  ) THEN RAISE EXCEPTION 'conversation_not_found'; END IF;

  INSERT INTO public.conversation_messages (conversation_id, role, content)
  VALUES
    (p_conversation_id, 'user',      p_user_message),
    (p_conversation_id, 'assistant', p_assistant_message);

  UPDATE public.conversations
  SET updated_at = now(), role_context = p_role_context,
      title = COALESCE(NULLIF(trim(p_title), ''), title)
  WHERE id = p_conversation_id AND user_id = p_user_id;

  RETURN p_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_with_member(
  p_user_id TEXT,
  p_name    TEXT,
  p_role    TEXT DEFAULT 'owner'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE workspace_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (p_name, p_user_id)
  RETURNING id INTO workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (
    workspace_id, p_user_id,
    CASE WHEN p_role IN ('owner','admin','editor','viewer','client_reviewer') THEN p_role ELSE 'owner' END
  );

  RETURN workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_personal_workspace(
  p_user_id TEXT,
  p_name    TEXT
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE workspace_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (p_name, p_user_id)
  RETURNING id INTO workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, p_user_id, 'owner');

  RETURN workspace_id;
END;
$$;

-- ================================================================
-- 20. VOICE RPCs
-- ================================================================

CREATE OR REPLACE FUNCTION public.save_voice_training_sample(
  p_user_id      TEXT,
  p_samples      JSONB,
  p_fingerprint  JSONB,
  p_sample_text  TEXT,
  p_analysis     JSONB,
  p_workspace_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  target_id           UUID;
  target_workspace_id UUID;
BEGIN
  target_workspace_id := p_workspace_id;

  IF target_workspace_id IS NULL THEN
    SELECT workspace_id INTO target_workspace_id
    FROM public.workspace_members
    WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  SELECT id INTO target_id
  FROM public.voice_profiles
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  IF target_id IS NULL THEN
    INSERT INTO public.voice_profiles (
      user_id, workspace_id, sample_posts, voice_fingerprint, characteristics, updated_at
    ) VALUES (
      p_user_id, target_workspace_id,
      COALESCE(p_samples, '[]'::jsonb),
      COALESCE(p_fingerprint, '{}'::jsonb),
      COALESCE(p_analysis, '{}'::jsonb),
      now()
    );
  ELSE
    UPDATE public.voice_profiles SET
      workspace_id    = COALESCE(target_workspace_id, workspace_id),
      sample_posts    = COALESCE(p_samples, '[]'::jsonb),
      voice_fingerprint = COALESCE(p_fingerprint, '{}'::jsonb),
      characteristics = COALESCE(p_analysis, '{}'::jsonb),
      updated_at      = now()
    WHERE id = target_id;
  END IF;

  INSERT INTO public.voice_training_logs (user_id, sample_text, ai_analysis)
  VALUES (p_user_id, p_sample_text, COALESCE(p_analysis, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_voice_training_samples(
  p_user_id      TEXT,
  p_workspace_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE target_id UUID;
BEGIN
  SELECT id INTO target_id
  FROM public.voice_profiles WHERE user_id = p_user_id
  ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  IF target_id IS NULL THEN
    INSERT INTO public.voice_profiles (user_id, workspace_id, sample_posts, voice_fingerprint, characteristics, updated_at)
    VALUES (p_user_id, p_workspace_id, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, now());
  ELSE
    UPDATE public.voice_profiles SET
      sample_posts    = '[]'::jsonb,
      voice_fingerprint = '{}'::jsonb,
      characteristics = '{}'::jsonb,
      updated_at      = now()
    WHERE id = target_id;
  END IF;

  DELETE FROM public.voice_training_logs WHERE user_id = p_user_id;
END;
$$;

-- ================================================================
-- 21. PGVECTOR (conditional — runs only if extension is enabled)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE public.voice_profiles
      ADD COLUMN IF NOT EXISTS embedding vector(768);

    ALTER TABLE public.voice_examples
      ADD COLUMN IF NOT EXISTS embedding vector(768);

    RAISE NOTICE 'pgvector: embedding columns created on voice_profiles and voice_examples';
  ELSE
    RAISE NOTICE 'pgvector not enabled — skipping embedding columns. Enable via Dashboard → Database → Extensions → vector, then re-run section 21.';
  END IF;
END $$;
