import { Redis } from "@upstash/redis"
import { createServiceClient } from "@/lib/server/supabase-rest"

let redis: Redis | null = null

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || ""
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
  if (!url.startsWith("https://") || url.includes("...") || !token || token.includes("...")) return null
  redis ??= new Redis({ url, token })
  return redis
}

export async function checkAndIncrementLimit(
  workspaceId: string,
  feature: "drafts" | "carousels" | "research",
  plan: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = getLimitForPlan(plan, feature)
  if (limit === "unlimited") return { allowed: true, remaining: Infinity, limit: Infinity }
  const activeRedis = getRedis()
  if (!activeRedis) return { allowed: true, remaining: limit, limit }

  const key = `limit:${workspaceId}:${feature}:${new Date().toISOString().slice(0, 7)}`

  const current = await activeRedis.incr(key)
  if (current === 1) {
    await activeRedis.expire(key, 60 * 60 * 24 * 35)
  }

  const remaining = limit - current

  if (current > limit) {
    await activeRedis.decr(key)
    return { allowed: false, remaining: 0, limit }
  }

  return { allowed: true, remaining: Math.max(0, remaining), limit }
}

function getLimitForPlan(plan: string, feature: string): number | "unlimited" {
  const limits = {
    Free: { drafts: 10, carousels: 2, research: 0 },
    Solo: { drafts: 25, carousels: 5, research: 0 },
    Pro: { drafts: 60, carousels: 15, research: 5 },
    Agency: { drafts: 60, carousels: 50, research: 25 },
  }
  return limits[plan as keyof typeof limits]?.[feature as keyof (typeof limits)["Free"]] ?? 0
}

export const PLAN_FEATURES = ["ai_drafts", "carousels", "hooks", "analyses"] as const

export type PlanFeature = (typeof PLAN_FEATURES)[number]

export type PlanName = "free" | "solo" | "pro" | "agency"

export const PLAN_USAGE_LIMITS: Record<PlanName, Record<PlanFeature, number>> = {
  free: { ai_drafts: 10, carousels: 2, hooks: 0, analyses: 0 },
  solo: { ai_drafts: 25, carousels: 5, hooks: 0, analyses: 0 },
  pro: { ai_drafts: 60, carousels: 15, hooks: 0, analyses: 0 },
  agency: { ai_drafts: 60, carousels: 50, hooks: 0, analyses: 0 },
}

export type PlanUsageRow = {
  plan: string
  ai_drafts_used: number
  carousels_used: number
  hooks_used: number
  analyses_used: number
}

type IncrementPlanUsageResult = {
  allowed: boolean
  current?: number
  limit?: number
  error?: string
}

const USAGE_FIELD_MAP: Record<PlanFeature, keyof PlanUsageRow> = {
  ai_drafts: "ai_drafts_used",
  carousels: "carousels_used",
  hooks: "hooks_used",
  analyses: "analyses_used",
}

let serviceClient: ReturnType<typeof createServiceClient> | null = null

const getServiceClient = () => {
  serviceClient ??= createServiceClient()
  return serviceClient
}

const normalizePlan = (plan: string | undefined): PlanName => {
  const normalized = String(plan || "free").toLowerCase()
  if (normalized === "free" || normalized === "solo" || normalized === "pro" || normalized === "agency") {
    return normalized
  }
  return "free"
}

const isValidUserId = (userId: string) => typeof userId === "string" && userId.trim().length > 0

const limitForUsagePlan = (plan: string | undefined, feature: PlanFeature) => {
  const normalizedPlan = normalizePlan(plan)
  return PLAN_USAGE_LIMITS[normalizedPlan][feature]
}

const emptyLimitStatus = (feature: PlanFeature) => {
  const limit = PLAN_USAGE_LIMITS.free[feature]
  return { allowed: false, current: 0, limit, remaining: Math.max(0, limit), plan: "free" as PlanName }
}

const getUsageRecord = async (
  userId: string
): Promise<{ usage: PlanUsageRow | null; error: boolean }> => {
  if (!isValidUserId(userId)) return { usage: null, error: true }
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase.rpc("get_or_create_plan_usage", { p_user_id: userId })
    if (error || !data) return { usage: null, error: true }
    return { usage: data as PlanUsageRow, error: false }
  } catch {
    return { usage: null, error: true }
  }
}

const ensureUsageRecord = async (userId: string): Promise<boolean> => {
  if (!isValidUserId(userId)) return false
  try {
    const supabase = getServiceClient()
    const { error } = await supabase.rpc("get_or_create_plan_usage", { p_user_id: userId })
    return !error
  } catch {
    return false
  }
}

const fieldFor = (feature: PlanFeature) => USAGE_FIELD_MAP[feature]


export async function getPlanLimitStatus(userId: string, feature: PlanFeature = "ai_drafts") {
  if (!isValidUserId(userId)) return emptyLimitStatus(feature)

  const { usage, error } = await getUsageRecord(userId)
  if (error) return emptyLimitStatus(feature)

  const plan = normalizePlan(usage?.plan)
  const limit = limitForUsagePlan(plan, feature)
  const current = Number(usage?.[fieldFor(feature)] || 0)

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
    plan,
  }
}

export async function checkPlanLimit(userId: string, feature: PlanFeature = "ai_drafts") {
  if (!isValidUserId(userId)) return emptyLimitStatus(feature)

  const status = await getPlanLimitStatus(userId, feature)
  if (!status.allowed) return status

  const ensured = await ensureUsageRecord(userId)
  if (!ensured) {
    return { ...status, allowed: false }
  }

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase.rpc("increment_plan_usage", {
      p_user_id: userId,
      p_field: fieldFor(feature),
      p_max_allowed: status.limit,
    })

    if (error) {
      return { ...status, allowed: false }
    }

    const result = (data || {}) as IncrementPlanUsageResult
    if (result.error) {
      return { ...status, allowed: false }
    }

    const current = Number(result.current ?? status.current)
    const limit = Number(result.limit ?? status.limit)

    return {
      allowed: Boolean(result.allowed),
      current,
      limit,
      remaining: Math.max(0, limit - current),
      plan: status.plan,
    }
  } catch {
    return { ...status, allowed: false }
  }
}

export async function getPlanStatus(userId: string) {
  if (!isValidUserId(userId)) {
    return {
      plan: "free" as PlanName,
      limits: PLAN_USAGE_LIMITS.free,
      used: {
        ai_drafts: 0,
        carousels: 0,
        hooks: 0,
        analyses: 0,
      },
      remaining: {
        ai_drafts: PLAN_USAGE_LIMITS.free.ai_drafts,
        carousels: PLAN_USAGE_LIMITS.free.carousels,
        hooks: PLAN_USAGE_LIMITS.free.hooks,
        analyses: PLAN_USAGE_LIMITS.free.analyses,
      },
      allowed: false,
    }
  }

  const { usage, error } = await getUsageRecord(userId)
  const plan = normalizePlan(usage?.plan)
  const limits = PLAN_USAGE_LIMITS[plan]
  const used = {
    ai_drafts: Number(usage?.ai_drafts_used || 0),
    carousels: Number(usage?.carousels_used || 0),
    hooks: Number(usage?.hooks_used || 0),
    analyses: Number(usage?.analyses_used || 0),
  }

  if (error) {
    return {
      plan: "free" as PlanName,
      limits: PLAN_USAGE_LIMITS.free,
      used: {
        ai_drafts: 0,
        carousels: 0,
        hooks: 0,
        analyses: 0,
      },
      remaining: {
        ai_drafts: PLAN_USAGE_LIMITS.free.ai_drafts,
        carousels: PLAN_USAGE_LIMITS.free.carousels,
        hooks: PLAN_USAGE_LIMITS.free.hooks,
        analyses: PLAN_USAGE_LIMITS.free.analyses,
      },
      allowed: false,
    }
  }

  return {
    plan,
    limits,
    used,
    remaining: {
      ai_drafts: Math.max(0, limits.ai_drafts - used.ai_drafts),
      carousels: Math.max(0, limits.carousels - used.carousels),
      hooks: Math.max(0, limits.hooks - used.hooks),
      analyses: Math.max(0, limits.analyses - used.analyses),
    },
    allowed: true,
  }
}

export { getRedis, getLimitForPlan, getServiceClient, normalizePlan, isValidUserId, limitForUsagePlan, emptyLimitStatus, getUsageRecord, ensureUsageRecord, fieldFor }

