import "server-only"

import { CAREER_PLAN_CREDITS, PLAN_CREDIT_ELIGIBLE_ADDONS } from "@/lib/career-pricing"
import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"

type PaidPlan = "Solo" | "Pro"
type BillingCycle = "monthly" | "quarterly" | "annual"

export async function grantCareerPlanCredits({
  userId,
  plan,
  billingCycle,
  sourceReference,
  expiresAt,
}: {
  userId: string
  plan: string
  billingCycle: string
  sourceReference: string
  expiresAt: string | null
}) {
  if (plan !== "Solo" && plan !== "Pro") return { granted: 0 }
  const cycle: BillingCycle = billingCycle === "annual" || billingCycle === "monthly" ? billingCycle : "quarterly"
  const quantity = CAREER_PLAN_CREDITS[plan as PaidPlan][cycle]
  if (quantity < 1) return { granted: 0 }

  const memberships = await supabaseSelect<{ workspace_id: string }>(
    "workspace_members",
    `user_id=eq.${encodeURIComponent(userId)}&select=workspace_id&limit=1`
  )
  const workspaceId = memberships[0]?.workspace_id
  if (!workspaceId) throw new Error("career_plan_credit_workspace_missing")

  const { error } = await createServiceClient().from("career_addon_orders").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    addon_key: "career_credit",
    product_key: `${plan.toLowerCase()}_plan_credit`,
    amount_pkr: 0,
    quantity,
    credits_consumed: 0,
    status: "paid",
    source_type: "plan_credit",
    source_reference: sourceReference,
    eligible_addons: [...PLAN_CREDIT_ELIGIBLE_ADDONS],
    expires_at: expiresAt,
  }, { onConflict: "user_id,source_type,source_reference", ignoreDuplicates: true })

  if (error) throw new Error(`career_plan_credit_grant_failed: ${error.message}`)
  return { granted: quantity }
}

export async function revokeCareerPlanCredits(userId: string, status: "cancelled" | "refunded") {
  const revokedAt = new Date().toISOString()
  const { error } = await createServiceClient()
    .from("career_addon_orders")
    .update({ status, expires_at: revokedAt, updated_at: revokedAt })
    .eq("user_id", userId)
    .eq("source_type", "plan_credit")
    .in("status", ["paid", "partially_consumed", "fulfilled"])
  if (error) throw new Error(`career_plan_credit_revoke_failed: ${error.message}`)
}
