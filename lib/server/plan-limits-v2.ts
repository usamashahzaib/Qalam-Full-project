// lib/server/plan-limits-v2.ts
// Infrastructure: Supabase RPC calls for plan usage tracking.
// Enforcement limits are sourced from lib/pricing.ts (single source of truth).

import { createServiceClient } from "./supabase-rest"
import { PLAN_CONFIG } from "@/lib/pricing"
import type { Feature } from "@/lib/pricing"
import type { PlanTier } from "@/types/domain"

export type { Feature }

const PLAN_PRIORITY: Record<PlanTier, number> = { Free: 0, Solo: 1, Pro: 2, Agency: 3 }

const normalizePlan = (plan?: string | null): PlanTier => {
  const value = String(plan || "").toLowerCase()
  if (value.includes("agency")) return "Agency"
  if (value.includes("pro")) return "Pro"
  if (value.includes("solo")) return "Solo"
  return "Free"
}

const FIELD_MAP: Record<Feature, string> = {
  drafts: "ai_drafts_used",
  carousels: "carousels_used",
  hooks: "hooks_used",
  analyses: "analyses_used",
}

// Get plan status from plan_usage table, respecting admin overrides
export async function getPlanStatus(externalUserId: string) {
  const supabase = createServiceClient()

  // Parallel: get usage + check admin override + check users.plan (payment source of truth)
  const [usageResult, overrideResult, usersResult] = await Promise.all([
    supabase.rpc("get_or_create_plan_usage", { p_user_id: externalUserId }),
    Promise.resolve(
      supabase
        .from("user_overrides")
        .select("plan_override, draft_limit_override, expires_at")
        .eq("user_id", externalUserId)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { plan_override?: string | null; draft_limit_override?: number | null; expires_at?: string | null } | null }>,
    // users.plan + plan_expires_at are updated by payment webhook - authoritative source
    Promise.resolve(
      supabase
        .from("users")
        .select("plan,plan_expires_at")
        .or(`id.eq.${externalUserId},external_user_id.eq.${externalUserId}`)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { plan?: string | null; plan_expires_at?: string | null } | null }>,
  ])

  // Try RPC result first; fall back to direct table query if RPC is unavailable
  let usage = (!usageResult.error && usageResult.data)
    ? JSON.parse(JSON.stringify(usageResult.data))
    : null

  if (!usage) {
    const { data: directRow } = await supabase
      .from("plan_usage")
      .select("*")
      .eq("user_id", externalUserId)
      .maybeSingle()
    if (directRow) {
      usage = directRow
    } else {
      // Row missing entirely - create it so future increments work
      const { data: newRow } = await supabase
        .from("plan_usage")
        .upsert({ user_id: externalUserId, plan: "free" }, { onConflict: "user_id" })
        .select("*")
        .maybeSingle()
      usage = newRow
    }
  }
  const override = overrideResult.data
  const usersPlan = normalizePlan(usersResult.data?.plan)
  const planExpiresAt = usersResult.data?.plan_expires_at ?? null

  // Base plan from plan_usage
  let plan = normalizePlan(usage?.plan)

  // Elevate to users.plan if it's higher (payment webhook updates users.plan but not plan_usage)
  if ((PLAN_PRIORITY[usersPlan] ?? 0) > (PLAN_PRIORITY[plan] ?? 0)) {
    plan = usersPlan
    // Sync plan_usage.plan to stay current (best-effort, non-blocking)
    void supabase.from("plan_usage").update({ plan }).eq("user_id", externalUserId)
  }

  // Downgrade to Free if subscription has expired
  if (plan !== "Free" && planExpiresAt && new Date(planExpiresAt) < new Date()) {
    plan = "Free"
  }

  // Apply admin plan override if not expired
  if (
    override?.plan_override &&
    (!override.expires_at || new Date(override.expires_at) > new Date())
  ) {
    plan = normalizePlan(override.plan_override)
  }

  const config = { ...PLAN_CONFIG[plan].limits }

  // Apply custom draft limit override
  if (typeof override?.draft_limit_override === "number" && override.draft_limit_override >= 0) {
    config.drafts = override.draft_limit_override
  }

  return {
    plan,
    drafts: {
      used: usage?.ai_drafts_used || 0,
      limit: config.drafts,
      remaining: Math.max(0, config.drafts - (usage?.ai_drafts_used || 0))
    },
    carousels: {
      used: usage?.carousels_used || 0,
      limit: config.carousels,
      remaining: Math.max(0, config.carousels - (usage?.carousels_used || 0))
    },
    hooks: {
      used: usage?.hooks_used || 0,
      limit: config.hooks,
      remaining: Math.max(0, config.hooks - (usage?.hooks_used || 0))
    },
    analyses: {
      used: usage?.analyses_used || 0,
      limit: config.analyses,
      remaining: Math.max(0, config.analyses - (usage?.analyses_used || 0))
    },
    cycleEnd: usage?.cycle_end,
    planExpiresAt,
  }
}

// Check if user can use a feature
export async function checkPlanLimit(externalUserId: string, feature: Feature) {
  const status = await getPlanStatus(externalUserId)
  const featureData = status[feature]

  return {
    allowed: featureData.remaining > 0,
    current: featureData.used,
    limit: featureData.limit,
    remaining: featureData.remaining,
    plan: status.plan,
  }
}

// Atomically increment usage using your existing RPC
export async function incrementUsage(externalUserId: string, feature: Feature) {
  const supabase = createServiceClient()
  const plan = (await checkPlanLimit(externalUserId, feature)).plan
  const config = PLAN_CONFIG[plan].limits
  const limit = config[feature]
  const field = FIELD_MAP[feature]

  try {
    const { data: result } = await supabase.rpc("increment_plan_usage", {
      p_user_id: externalUserId,
      p_field: field,
      p_max_allowed: limit
    })

    if (!result) throw new Error("rpc_returned_null")

    const parsed = JSON.parse(JSON.stringify(result))
    return {
      allowed: parsed.allowed === true,
      current: parsed.current || 0,
      limit: parsed.limit || limit,
      remaining: Math.max(0, (parsed.limit || limit) - (parsed.current || 0)),
      error: parsed.error,
    }
  } catch {
    // RPC not deployed or failed - fall back to direct non-atomic update
    try {
      const { data: row } = await supabase
        .from("plan_usage")
        .select(field)
        .eq("user_id", externalUserId)
        .maybeSingle()
      const currentVal: number = (row as Record<string, number> | null)?.[field] ?? 0
      if (currentVal >= limit) {
        return { allowed: false, current: currentVal, limit, remaining: 0, error: "limit_exceeded" }
      }
      await supabase
        .from("plan_usage")
        .update({ [field]: currentVal + 1, updated_at: new Date().toISOString() })
        .eq("user_id", externalUserId)
      return {
        allowed: true,
        current: currentVal + 1,
        limit,
        remaining: Math.max(0, limit - (currentVal + 1)),
      }
    } catch {
      return { allowed: false, current: 0, limit, remaining: 0, error: "usage_update_failed" }
    }
  }
}

// Check if a feature is allowed by plan name
export function isFeatureAllowed(plan: string, feature: string): boolean {
  const normalized = normalizePlan(plan)
  const config = PLAN_CONFIG[normalized].limits

  if (feature === "carousel" || feature === "carousel_standard" || feature === "carousels") return config.carousels > 0
  if (feature === "voice" || feature === "voiceProfile") return normalized !== "Free"
  if (feature === "research" || feature === "competitorResearch") return normalized !== "Free"
  if (feature === "teamSeats") return normalized === "Agency"
  if (feature === "approvalWorkflow") return normalized === "Pro" || normalized === "Agency"
  if (feature === "basic_analytics") return normalized !== "Free"

  return normalized !== "Free"
}
