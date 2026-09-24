import "server-only"

// /api/payments/test-webhook writes real payment rows and grants real plans
// through the live activation pipeline. That is what makes it useful on
// preview and local environments, and what makes it dangerous on production,
// so production requires an explicit, temporary opt-in on top of the admin
// key and admin session the route already demands.
export const isTestWebhookEnabled = (source: Record<string, string | undefined> = process.env): boolean => {
  const tier = (source.VERCEL_ENV || source.NEXT_PUBLIC_QALAM_ENV || source.NEXT_PUBLIC_VERCEL_ENV || "").toLowerCase().trim()
  if (tier !== "production") return true
  return source.PAYMENTS_TEST_WEBHOOK_ENABLED === "1"
}
