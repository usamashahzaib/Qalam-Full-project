// lib/server/plan-limits-v2.ts
// CORRECTED - uses your actual plan_usage table and increment_plan_usage RPC

import { createServiceClient } from "./supabase-rest"

export type Feature = "drafts" | "carousels" | "hooks" | "analyses"
export type PlanName = "free" | "solo" | "pro" | "agency"

const PLAN_CONFIG: Record<PlanName, Record<Feature, number>> = {
  free: { drafts: 5, carousels: 1, hooks: 5, analyses: 5 },
  solo: { drafts: 30, carousels: 3, hooks: 30, analyses: 10 },
  pro: { drafts: 60, carousels: 10, hooks: 60, analyses: 20 },
  agency: { drafts: 300, carousels: 50, hooks: 300, analyses: 100 },
}

const normalizePlan = (plan?: string | null): PlanName => {
  const value = String(plan || "").toLowerCase()
  if (value.includes("agency")) return "agency"
  if (value.includes("pro")) return "pro"
  if (value.includes("solo")) return "solo"
  return "free"
}

const FIELD_MAP: Record<Feature, string> = {
  drafts: "ai_drafts_used",
  carousels: "carousels_used",
  hooks: "hooks_used",
  analyses: "analyses_used",
}

// Get plan status from plan_usage table
export async function getPlanStatus(externalUserId: string) {
  const supabase = createServiceClient()

  let usageData: unknown = null
  try {
    const { data } = await supabase.rpc("get_or_create_plan_usage", { p_user_id: externalUserId })
    usageData = data
  } catch (error) {
    throw new Error(`Plan limit check failed: ${(error as Error).message}`)
  }

  const usage = usageData ? JSON.parse(JSON.stringify(usageData)) : null
  const plan = normalizePlan(usage?.plan)
  const config = PLAN_CONFIG[plan]

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
  const config = PLAN_CONFIG[plan]
  const limit = config[feature]
  const field = FIELD_MAP[feature]

  try {
    const { data: result } = await supabase.rpc("increment_plan_usage", {
      p_user_id: externalUserId,
      p_field: field,
      p_max_allowed: limit
    })

    if (!result) return { allowed: true, current: 0, limit, remaining: limit }

    const parsed = JSON.parse(JSON.stringify(result))
    return {
      allowed: parsed.allowed === true,
      current: parsed.current || 0,
      limit: parsed.limit || limit,
      remaining: Math.max(0, (parsed.limit || limit) - (parsed.current || 0)),
      error: parsed.error,
    }
  } catch (error) {
    throw new Error(`Plan limit check failed: ${(error as Error).message}`)
  }
}

// Check if a feature is allowed by plan name
export function isFeatureAllowed(plan: string, feature: string): boolean {
  const normalized = normalizePlan(plan)
  const config = PLAN_CONFIG[normalized]

  if (feature === "carousel" || feature === "carousel_standard" || feature === "carousels") return config.carousels > 0
  if (feature === "voice" || feature === "voiceProfile") return normalized !== "free"
  if (feature === "research" || feature === "competitorResearch") return normalized !== "free"
  if (feature === "approvalWorkflow" || feature === "teamSeats") return normalized === "agency"
  if (feature === "basic_analytics") return normalized !== "free"

  return normalized !== "free"
}