import "server-only"

import type { BillingCycle, PlanName } from "@/lib/pricing"

// Webhook-only mapping. Keep non-public variant IDs out of the shared client bundle.
export const LEMONSQUEEZY_VARIANT_PLANS: Record<string, { planName: PlanName; billingCycle: BillingCycle }> = {
  // Solo
  "2123554": { planName: "Solo", billingCycle: "monthly" },
  "2123567": { planName: "Solo", billingCycle: "quarterly" },
  // Pro
  "1928922": { planName: "Pro", billingCycle: "monthly" },
  "2027636": { planName: "Pro", billingCycle: "quarterly" },
  // Agency
  "2123576": { planName: "Agency", billingCycle: "monthly" },
  "2123586": { planName: "Agency", billingCycle: "quarterly" },
}
