import "server-only"

import type { BillingCycle, PlanName } from "@/lib/pricing"

// Webhook-only mapping. Keep non-public variant IDs out of the shared client bundle.
export const LEMONSQUEEZY_VARIANT_PLANS: Record<string, { planName: PlanName; billingCycle: BillingCycle }> = {
  "1928885": { planName: "Solo", billingCycle: "monthly" },
  "1929048": { planName: "Solo", billingCycle: "annual" },
  "1928922": { planName: "Pro", billingCycle: "monthly" },
  "1929064": { planName: "Pro", billingCycle: "annual" },
  ...(process.env.LEMONSQUEEZY_SOLO_QUARTERLY_VARIANT_ID
    ? { [process.env.LEMONSQUEEZY_SOLO_QUARTERLY_VARIANT_ID]: { planName: "Solo" as PlanName, billingCycle: "quarterly" as BillingCycle } }
    : {}),
  ...(process.env.LEMONSQUEEZY_PRO_QUARTERLY_VARIANT_ID
    ? { [process.env.LEMONSQUEEZY_PRO_QUARTERLY_VARIANT_ID]: { planName: "Pro" as PlanName, billingCycle: "quarterly" as BillingCycle } }
    : {}),
}
