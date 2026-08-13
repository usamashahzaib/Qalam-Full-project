import "server-only"

const read = (key: string) => process.env[key]?.trim() || ""

export const env = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL") || read("SUPABASE_URL"),
  supabasePublishableKey:
    read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    read("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  linkedInClientId: read("LINKEDIN_CLIENT_ID"),
  linkedInClientSecret: read("LINKEDIN_CLIENT_SECRET"),
  linkedInVersion: read("LINKEDIN_VERSION") || "202602",
  geminiApiKey: read("GEMINI_API_KEY"),
  groqApiKey: read("GROQ_API_KEY"),
  mistralApiKey: read("MISTRAL_API_KEY"),
  cerebrasApiKey: read("CEREBRAS_API_KEY"),
  openrouterApiKey: read("OPENROUTER_API_KEY"),
  authSecret: read("AUTH_SECRET"),
  upstashRedisUrl: read("UPSTASH_REDIS_REST_URL"),
  upstashRedisToken: read("UPSTASH_REDIS_REST_TOKEN"),
  appAdminEmails: read("APP_ADMIN_EMAILS"),
  frontendOrigin:
    read("FRONTEND_ORIGIN") ||
    read("NEXT_PUBLIC_APP_URL") ||
    read("NEXT_PUBLIC_SITE_URL") ||
    "http://localhost:3000",
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  jazzCashWebhookSecret: read("JAZZCASH_WEBHOOK_SECRET"),
  easyPaisaWebhookSecret: read("EASYPAISA_WEBHOOK_SECRET"),
  lemonSqueezyWebhookSecret: read("LEMONSQUEEZY_WEBHOOK_SECRET"),
  lemonSqueezyApiKey: read("LEMONSQUEEZY_API_KEY"),
  lemonSqueezyCareerAddonVariantIds: {
    extra_resume: read("LEMONSQUEEZY_CAREER_ADDON_EXTRA_RESUME_VARIANT_ID"),
    cover_letter: read("LEMONSQUEEZY_CAREER_ADDON_COVER_LETTER_VARIANT_ID"),
    interview_pack: read("LEMONSQUEEZY_CAREER_ADDON_INTERVIEW_PACK_VARIANT_ID"),
    recruiter_review: read("LEMONSQUEEZY_CAREER_ADDON_RECRUITER_REVIEW_VARIANT_ID"),
    linkedin_rewrite: read("LEMONSQUEEZY_CAREER_ADDON_LINKEDIN_REWRITE_VARIANT_ID"),
    career_blueprint: read("LEMONSQUEEZY_CAREER_ADDON_CAREER_BLUEPRINT_VARIANT_ID"),
  },
  resendApiKey: read("RESEND_API_KEY"),
  transactionalEmailFrom: read("TRANSACTIONAL_EMAIL_FROM") || "Qalam <info@byqalam.com>",
  cronSecret: read("CRON_SECRET"),
  qstashToken: read("QSTASH_TOKEN"),
  qstashCurrentSigningKey: read("QSTASH_CURRENT_SIGNING_KEY"),
  qstashNextSigningKey: read("QSTASH_NEXT_SIGNING_KEY"),
  // 0 (unset) means no cap enforced - AI generation still works, it just isn't cost-capped.
  aiDailySpendCapUsd: Number(read("AI_DAILY_SPEND_CAP_USD")) || 0,
}

export const requireSupabaseEnv = () => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("supabase_env_missing")
  }
}

export function requireAiEnv(): void {
  if (!env.groqApiKey && !env.geminiApiKey && !env.mistralApiKey && !env.cerebrasApiKey && !env.openrouterApiKey) {
    throw new Error("At least one AI provider key is required")
  }
}

export function requireAuthEnv(): void {
  if (!env.authSecret) {
    throw new Error("AUTH_SECRET is required")
  }
}

export function requireRedisEnv(): { url: string; token: string } | null {
  if (!env.upstashRedisUrl || !env.upstashRedisToken) return null
  return { url: env.upstashRedisUrl, token: env.upstashRedisToken }
}

export function requireCronEnv(): string {
  if (!env.cronSecret) throw new Error("CRON_SECRET is required for cron endpoints")
  return env.cronSecret
}

export const supportEnv = {
  email: read("APP_SUPPORT_EMAIL") || "info@byqalam.com",
}

export const groqApiKey = env.groqApiKey
export const geminiApiKey = env.geminiApiKey
export const mistralApiKey = env.mistralApiKey
export const cerebrasApiKey = env.cerebrasApiKey
export const openrouterApiKey = env.openrouterApiKey
export const authSecret = env.authSecret
export const upstashRedisUrl = env.upstashRedisUrl
export const upstashRedisToken = env.upstashRedisToken
export const appAdminEmails = env.appAdminEmails
