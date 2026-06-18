// lib/server/plan-limits-v2.ts
// Infrastructure: Supabase RPC calls for plan usage tracking.
// Enforcement limits are sourced from lib/pricing.ts (single source of truth).

import { createServiceClient } from "./supabase-rest"
import { PLAN_CONFIG } from "@/lib/pricing"
import { resolvePlanExpiry } from "@/lib/plan-expiry"
import type { Feature } from "@/lib/pricing"
import type { PlanTier } from "@/types/domain"

export type { Feature }

export const PLAN_PRIORITY: Record<string, number> = { free: 0, solo: 1, pro: 2, agency: 3 }

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

// Single canonical plan resolver — call this everywhere instead of any local higherPlan logic.
export async function getCanonicalPlan(userId: string): Promise<string> {
  return (await getPlanStatus(userId)).plan
}

// Get plan status from plan_usage table, respecting admin overrides
export async function getPlanStatus(userId: string) {
  const supabase = createServiceClient()

  // Parallel: get usage + check admin override + check users.plan (payment source of truth)
  const [usageResult, overrideResult, usersResult, paymentResult] = await Promise.all([
    supabase.rpc("get_or_create_plan_usage", { p_user_id: userId }),
    Promise.resolve(
      supabase
        .from("user_overrides")
        .select("plan_override, draft_limit_override, expires_at")
        .eq("user_id", userId)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { plan_override?: string | null; draft_limit_override?: number | null; expires_at?: string | null } | null }>,
    // users.plan + plan_expires_at are updated by payment webhook - authoritative source
    Promise.resolve(
      supabase
        .from("users")
        .select("plan,plan_expires_at,created_at")
        .or(`id.eq.${userId},external_user_id.eq.${userId}`)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { plan?: string | null; plan_expires_at?: string | null; created_at?: string | null } | null }>,
    Promise.resolve(
      supabase
        .from("payments")
        .select("created_at,processed_at")
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { created_at?: string | null; processed_at?: string | null } | null }>,
  ])

  // Try RPC result first; fall back to direct table query if RPC is unavailable
  let usage = (!usageResult.error && usageResult.data)
    ? JSON.parse(JSON.stringify(usageResult.data))
    : null

  if (!usage) {
    const { data: directRow } = await supabase
      .from("plan_usage")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
    if (directRow) {
      usage = directRow
    } else {
      // Row missing entirely - create it so future increments work
      const { data: newRow } = await supabase
        .from("plan_usage")
        .upsert({ user_id: userId, plan: "free" }, { onConflict: "user_id" })
        .select("*")
        .maybeSingle()
      usage = newRow
    }
  }
  const override = overrideResult.data
  const usersPlan = normalizePlan(usersResult.data?.plan)
  const boughtAt = paymentResult.data?.processed_at || paymentResult.data?.created_at || usage?.cycle_start || usersResult.data?.created_at || null
  const planExpiresAt = resolvePlanExpiry(usersResult.data?.plan_expires_at || usage?.cycle_end, boughtAt)

  // Base plan directly from users table (payment webhook source of truth)
  let plan = usersPlan

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
export async function checkPlanLimit(userId: string, feature: Feature) {
  const status = await getPlanStatus(userId)
  const featureData = status[feature]

  return {
    allowed: featureData.remaining > 0,
    current: featureData.used,
    limit: featureData.limit,
    remaining: featureData.remaining,
    plan: status.plan,
  }
}

// Atomically increment usage using your existing RPC.
// internalUserId is the Supabase UUID; used as a fallback lookup key when
// the plan_usage row was created under the internal UUID instead of the external OAuth sub.
export async function incrementUsage(userId: string, feature: Feature, internalUserId?: string) {
  const supabase = createServiceClient()
  const plan = (await checkPlanLimit(userId, feature)).plan
  const config = PLAN_CONFIG[plan].limits
  const limit = config[feature]
  const field = FIELD_MAP[feature]

  try {
    const { data: result } = await supabase.rpc("increment_plan_usage", {
      p_user_id: userId,
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
    // RPC not deployed or failed - fall back to optimistic-concurrency CAS with retry.
    const MAX_ATTEMPTS = 3
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { data: row } = await supabase
          .from("plan_usage")
          .select(field)
          .eq("user_id", userId)
          .maybeSingle()
        const currentVal: number = (row as Record<string, number> | null)?.[field] ?? 0
        if (currentVal >= limit) {
          return { allowed: false, current: currentVal, limit, remaining: 0, error: "limit_exceeded" }
        }
        // Conditional update: only succeeds if the field value hasn't changed since we read it.
        const { data: updated } = await supabase
          .from("plan_usage")
          .update({ [field]: currentVal + 1, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq(field, currentVal)
          .select(field)
          .maybeSingle()
        if (updated) {
          return {
            allowed: true,
            current: currentVal + 1,
            limit,
            remaining: Math.max(0, limit - (currentVal + 1)),
          }
        }
        // Another request modified the row between our read and write — retry.
      } catch {
        return { allowed: false, current: 0, limit, remaining: 0, error: "usage_update_failed" }
      }
    }
    return { allowed: false, current: 0, limit, remaining: 0, error: "concurrent_update" }
  }
}

// Single source of truth for feature gating — delegates to lib/pricing.ts.
export { isFeatureAllowed } from "@/lib/pricing"
