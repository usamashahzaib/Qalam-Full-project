import "server-only"

// lib/server/plan-limits-v2.ts
// Infrastructure: Supabase RPC calls for plan usage tracking.
// Enforcement limits are sourced from lib/pricing.ts (single source of truth).

import { cache } from "react"
import { createServiceClient, sanitizeOrFilterValue } from "./supabase-rest"
import { PLAN_CONFIG } from "@/lib/pricing"
import { resolvePlanExpiry } from "@/lib/plan-expiry"
import { getPlanStatus as getExpiryPlanStatus, getQuotaResetDate } from "./plan-expiry"
import { log } from "./logging"
import type { Feature } from "@/lib/pricing"
import type { PlanTier } from "@/types/domain"

export type { Feature }
export { requirePlan } from "./require-plan"

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

const USAGE_FIELDS = ["ai_drafts_used", "carousels_used", "hooks_used", "analyses_used", "competitor_runs_used"] as const
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000

const getThirtyDayWindow = (startedAt?: string | null) => {
  if (!startedAt) return null
  const start = new Date(startedAt)
  if (Number.isNaN(start.getTime())) return null
  const elapsed = Math.max(0, Math.floor((Date.now() - start.getTime()) / MS_30_DAYS))
  const windowStart = new Date(start.getTime() + elapsed * MS_30_DAYS)
  const windowEnd = new Date(windowStart.getTime() + MS_30_DAYS)
  return { windowStart, windowEnd }
}

// Single canonical plan resolver - call this everywhere instead of any local higherPlan logic.
export async function getCanonicalPlan(userId: string): Promise<string> {
  return (await getPlanStatus(userId)).plan
}

// Get plan status from plan_usage table, respecting admin overrides.
// Wrapped with React cache() so repeated calls with the same userId within a
// single server request (API route or Server Component) hit the DB only once.
export const getPlanStatus = cache(async function getPlanStatusImpl(userId: string) {
  const supabase = createServiceClient()
  const expiryStatus = await getExpiryPlanStatus(userId)

  // Phase 1 (parallel): usage + users.plan + payment - no inter-dependencies
  const [usageResult, usersResult, paymentResult] = await Promise.all([
    supabase.rpc("get_or_create_plan_usage", { p_user_id: userId }),
    // users.plan + plan_expires_at are updated by payment webhook - authoritative source
    // Include id + external_user_id so we can check overrides under either ID in phase 2
    Promise.resolve(
      supabase
        .from("users")
        .select("id,external_user_id,plan,plan_expires_at,plan_started_at,billing_cycle,created_at")
        .or(`id.eq.${sanitizeOrFilterValue(userId)},external_user_id.eq.${sanitizeOrFilterValue(userId)}`)
        .maybeSingle()
    ).catch(() => ({ data: null })) as Promise<{ data: { id?: string | null; external_user_id?: string | null; plan?: string | null; plan_expires_at?: string | null; plan_started_at?: string | null; billing_cycle?: string | null; created_at?: string | null } | null }>,
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

  // Phase 2: check user_overrides with ALL matching IDs in one query.
  // Admin panel stores overrides under externalId (OAuth sub) but getPlanStatus is called
  // with the internal Supabase UUID - need to try both so overrides are never missed.
  const idsToCheck = [userId, usersResult.data?.id, usersResult.data?.external_user_id]
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  const uniqueIds = [...new Set(idsToCheck)]
  type OverrideRow = { user_id: string; plan_override?: string | null; draft_limit_override?: number | null; expires_at?: string | null }
  const { data: overrideRows } = await supabase
    .from("user_overrides")
    .select("user_id, plan_override, draft_limit_override, expires_at")
    .in("user_id", uniqueIds)
    .then((r) => r, () => ({ data: null as OverrideRow[] | null }))
  // Prefer a row keyed by the exact id we were called with, then fall back to any match.
  const overrideData = (overrideRows || []).find((row) => row.user_id === userId) || overrideRows?.[0] || null
  const overrideResult = { data: overrideData }

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
  const quotaWindow = usersResult.data?.billing_cycle === "annual" ? getThirtyDayWindow(usersResult.data?.plan_started_at) : null
  if (usage && quotaWindow) {
    const cycleStart = usage?.cycle_start ? new Date(String(usage.cycle_start)) : null
    if (!cycleStart || Number.isNaN(cycleStart.getTime()) || cycleStart < quotaWindow.windowStart) {
      const resetPayload: Record<string, number | string> = {
        cycle_start: quotaWindow.windowStart.toISOString(),
        cycle_end: quotaWindow.windowEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }
      for (const field of USAGE_FIELDS) resetPayload[field] = 0
      await supabase
        .from("plan_usage")
        .update(resetPayload)
        .eq("user_id", userId)
        .then(undefined, (err: unknown) => log.error("plan_usage.window_reset_failed", { error: (err as Error)?.message }))
      usage = { ...usage, ...resetPayload }
    }
  }
  const override = overrideResult.data
  const usersPlan = normalizePlan(expiryStatus.plan || usersResult.data?.plan)
  const boughtAt = paymentResult.data?.processed_at || paymentResult.data?.created_at || usage?.cycle_start || usersResult.data?.created_at || null
  // Use the stored plan_expires_at from users table as the authoritative expiry.
  // resolvePlanExpiry is only a display fallback - never let a computed date override the stored one.
  const storedExpiresAt = usersResult.data?.plan_expires_at ?? null
  const planExpiresAt = resolvePlanExpiry(storedExpiresAt || usage?.cycle_end, boughtAt)

  // Base plan directly from users table (payment webhook source of truth)
  let plan = usersPlan

  // Downgrade to Free ONLY when plan_expires_at is explicitly stored in the DB and has passed.
  // If plan_expires_at is null (e.g. admin-set plan, no stored expiry), leave plan intact.
  if (!expiryStatus.isActive) {
    plan = "Free"
  }

  // Apply admin plan override if not expired
  const overrideActive = Boolean(
    override?.plan_override &&
    (!override.expires_at || new Date(override.expires_at) > new Date())
  )
  if (overrideActive) {
    plan = normalizePlan(override!.plan_override!)
  }

  const config = { ...PLAN_CONFIG[plan].limits }

  // Apply custom draft limit override
  if (typeof override?.draft_limit_override === "number" && override.draft_limit_override >= 0) {
    config.drafts = override.draft_limit_override
  }

  return {
    plan,
    overrideActive,
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
    cycleEnd: getQuotaResetDate(usersResult.data?.plan_started_at ?? null, usersResult.data?.billing_cycle ?? null)?.toISOString() || usage?.cycle_end,
    planExpiresAt: expiryStatus.expiresAt || planExpiresAt,
    isActive: expiryStatus.isActive,
    expiresAt: expiryStatus.expiresAt,
    renewalDue: expiryStatus.renewalDue,
    daysUntilExpiry: expiryStatus.daysUntilExpiry,
  }
})

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
  } catch (err) {
    log.error("plan_usage.rpc_failed", { userId, feature, error: err instanceof Error ? err.message : String(err) })
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
        // Another request modified the row between our read and write - retry.
      } catch {
        return { allowed: false, current: 0, limit, remaining: 0, error: "usage_update_failed" }
      }
    }
    // All CAS attempts lost to concurrent updates. Do a final authoritative read
    // before denying - the concurrent winners may have pushed the counter over the
    // limit, in which case denying is correct; if they haven't, the user should not
    // be blocked just because we lost the race.
    try {
      const { data: finalRow } = await supabase.from("plan_usage").select(field).eq("user_id", userId).maybeSingle()
      const finalVal: number = (finalRow as Record<string, number> | null)?.[field] ?? 0
      return { allowed: finalVal < limit, current: finalVal, limit, remaining: Math.max(0, limit - finalVal), error: finalVal >= limit ? "limit_exceeded" : undefined }
    } catch {
      return { allowed: false, current: 0, limit, remaining: 0, error: "concurrent_update" }
    }
  }
}

// Refund one usage unit - call this when generation succeeds but a later step fails.
// Best-effort: if the RPC/DB call fails we log and move on (over-refunding is fine; under-refunding is not).
export async function decrementUsage(userId: string, feature: Feature): Promise<void> {
  const supabase = createServiceClient()
  const field = FIELD_MAP[feature]

  try {
    // Try RPC first (may not be deployed yet)
    await supabase.rpc("decrement_plan_usage", { p_user_id: userId, p_field: field })
  } catch {
    // CAS fallback
    try {
      const { data: row } = await supabase.from("plan_usage").select(field).eq("user_id", userId).maybeSingle()
      const current: number = (row as Record<string, number> | null)?.[field] ?? 0
      if (current <= 0) return
      await supabase
        .from("plan_usage")
        .update({ [field]: current - 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq(field, current)
    } catch (err) {
      log.error("plan_usage.decrement_failed", { userId, feature, error: (err as Error).message })
    }
  }
}

// Single source of truth for feature gating - delegates to lib/pricing.ts.
export { isFeatureAllowed } from "@/lib/pricing"