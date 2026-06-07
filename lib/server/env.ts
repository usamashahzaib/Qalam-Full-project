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
  frontendOrigin:
    read("FRONTEND_ORIGIN") ||
    read("NEXT_PUBLIC_APP_URL") ||
    read("NEXT_PUBLIC_SITE_URL") ||
    "http://localhost:3000",
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  jazzCashWebhookSecret: read("JAZZCASH_WEBHOOK_SECRET"),
  easyPaisaWebhookSecret: read("EASYPAISA_WEBHOOK_SECRET"),
  resendApiKey: read("RESEND_API_KEY"),
  transactionalEmailFrom: read("TRANSACTIONAL_EMAIL_FROM") || "Qalam <support@byqalam.com>",
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
