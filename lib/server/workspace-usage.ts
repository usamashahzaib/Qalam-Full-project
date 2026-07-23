import "server-only"

// lib/server/workspace-usage.ts
// Per-workspace usage enforcement for the Agency tier. plan_usage (see
// plan-limits-v2.ts) is keyed by user_id, so an Agency owner's client
// workspaces all shared one draft counter - this tracks usage per
// workspace per calendar month instead, matching the "60 posts x 5
// workspaces" allowance sold on the Agency plan.

import { createServiceClient } from "./supabase-rest"
import { log } from "./logging"

export type WorkspaceUsageFeature = "drafts" | "carousels"

export const WORKSPACE_USAGE_LIMITS: Record<WorkspaceUsageFeature, number> = {
  drafts: 60,
  carousels: 10,
}

const FIELD_MAP: Record<WorkspaceUsageFeature, string> = {
  drafts: "ai_drafts_used",
  carousels: "carousels_used",
}

const currentPeriod = () => {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export type WorkspaceUsageResult = {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  error?: string
}

export async function checkWorkspaceUsage(
  workspaceId: string,
  feature: WorkspaceUsageFeature
): Promise<WorkspaceUsageResult> {
  const supabase = createServiceClient()
  const { month, year } = currentPeriod()
  const field = FIELD_MAP[feature]
  const limit = WORKSPACE_USAGE_LIMITS[feature]

  const { data } = await supabase
    .from("workspace_usage")
    .select(field)
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle()

  const used = (data as Record<string, number> | null)?.[field] ?? 0
  return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) }
}

// Atomic increment via RPC, with a best-effort CAS fallback if the RPC
// hasn't been deployed yet - mirrors incrementUsage() in plan-limits-v2.ts.
export async function incrementWorkspaceUsage(
  workspaceId: string,
  feature: WorkspaceUsageFeature
): Promise<WorkspaceUsageResult> {
  const supabase = createServiceClient()
  const { month, year } = currentPeriod()
  const field = FIELD_MAP[feature]
  const limit = WORKSPACE_USAGE_LIMITS[feature]

  try {
    const { data, error } = await supabase.rpc("increment_workspace_usage", {
      p_workspace_id: workspaceId,
      p_month: month,
      p_year: year,
      p_field: field,
      p_max_allowed: limit,
    })
    if (error || !data) throw new Error(error?.message || "rpc_returned_null")

    const parsed = JSON.parse(JSON.stringify(data))
    return {
      allowed: parsed.allowed === true,
      used: parsed.current || 0,
      limit,
      remaining: Math.max(0, limit - (parsed.current || 0)),
      error: parsed.error,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    log.error("workspace_usage.rpc_failed", { workspaceId, feature, error: errMsg })

    // Migration 0056 hasn't run in this environment yet - fail open rather
    // than blocking Agency generation on a table/function that doesn't exist.
    if (/does not exist|schema cache|could not find/i.test(errMsg)) {
      return { allowed: true, used: 0, limit, remaining: limit, error: "workspace_usage_not_deployed" }
    }

    // CAS fallback for transient RPC failures once the migration has run.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data: row } = await supabase
          .from("workspace_usage")
          .select(field)
          .eq("workspace_id", workspaceId)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle()
        const currentVal: number = (row as Record<string, number> | null)?.[field] ?? 0
        if (currentVal >= limit) {
          return { allowed: false, used: currentVal, limit, remaining: 0, error: "limit_exceeded" }
        }
        if (!row) {
          const { error: insertErr } = await supabase
            .from("workspace_usage")
            .insert({ workspace_id: workspaceId, month, year, [field]: 1 })
          if (!insertErr) return { allowed: true, used: 1, limit, remaining: Math.max(0, limit - 1) }
          continue
        }
        const { data: updated } = await supabase
          .from("workspace_usage")
          .update({ [field]: currentVal + 1, updated_at: new Date().toISOString() })
          .eq("workspace_id", workspaceId)
          .eq("month", month)
          .eq("year", year)
          .eq(field, currentVal)
          .select(field)
          .maybeSingle()
        if (updated) {
          return { allowed: true, used: currentVal + 1, limit, remaining: Math.max(0, limit - (currentVal + 1)) }
        }
      } catch {
        return { allowed: false, used: 0, limit, remaining: 0, error: "usage_update_failed" }
      }
    }
    return { allowed: false, used: 0, limit, remaining: 0, error: "concurrent_update" }
  }
}

// Best-effort refund - call when generation succeeds at the user-usage level
// but fails afterward (mirrors decrementUsage() in plan-limits-v2.ts).
export async function decrementWorkspaceUsage(workspaceId: string, feature: WorkspaceUsageFeature): Promise<void> {
  const supabase = createServiceClient()
  const { month, year } = currentPeriod()
  const field = FIELD_MAP[feature]

  try {
    await supabase.rpc("decrement_workspace_usage", { p_workspace_id: workspaceId, p_month: month, p_year: year, p_field: field })
  } catch {
    try {
      const { data: row } = await supabase
        .from("workspace_usage")
        .select(field)
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle()
      const current: number = (row as Record<string, number> | null)?.[field] ?? 0
      if (current <= 0) return
      await supabase
        .from("workspace_usage")
        .update({ [field]: current - 1, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .eq("year", year)
    } catch (err) {
      log.error("workspace_usage.decrement_failed", { workspaceId, feature, error: (err as Error).message })
    }
  }
}
