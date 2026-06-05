const read = (key: string) => process.env[key]?.trim() || ""

let _oauthStateSecret: string | undefined

export const env = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL") || read("SUPABASE_URL"),
  supabasePublishableKey:
    read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    read("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  linkedInClientId: read("LINKEDIN_CLIENT_ID"),
  linkedInClientSecret: read("LINKEDIN_CLIENT_SECRET"),
  linkedInRedirectUri: read("LINKEDIN_REDIRECT_URI"),
  linkedInVersion: read("LINKEDIN_VERSION") || "202602",
  // Lazy getter for OAuth state signing (LinkedIn callback state tokens).
  get oauthStateSecret(): string {
    if (_oauthStateSecret !== undefined) return _oauthStateSecret
    const secret = read("OAUTH_STATE_SECRET") || read("APP_SESSION_SECRET")
    if (secret) return (_oauthStateSecret = secret)
    if (process.env.NODE_ENV === "production") {
      throw new Error("OAUTH_STATE_SECRET env var is required in production")
    }
    return (_oauthStateSecret = "qalam-dev-oauth-state-local-only")
  },
  frontendOrigin:
    read("FRONTEND_ORIGIN") ||
    read("NEXT_PUBLIC_APP_URL") ||
    read("NEXT_PUBLIC_SITE_URL") ||
    "http://localhost:3000",
  // Set in Clerk Dashboard → Webhooks → signing secret
  clerkWebhookSecret: read("CLERK_WEBHOOK_SECRET"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  jazzCashWebhookSecret: read("JAZZCASH_WEBHOOK_SECRET"),
  easyPaisaWebhookSecret: read("EASYPAISA_WEBHOOK_SECRET"),
  resendApiKey: read("RESEND_API_KEY"),
  transactionalEmailFrom: read("TRANSACTIONAL_EMAIL_FROM") || "Qalam <support@byqalam.com>",
}

export const requireLinkedInEnv = () => {
  if (!env.linkedInClientId || !env.linkedInClientSecret || !env.linkedInRedirectUri) {
    throw new Error("linkedin_env_missing")
  }
}

export const requireSupabaseEnv = () => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("supabase_env_missing")
  }
}

export const supportEnv = {
  email: read("APP_SUPPORT_EMAIL") || "support@byqalam.com",
}

export const groqApiKey = read("GROQ_API_KEY")
