import "server-only"

import { createServiceClient } from "./supabase-rest"
import { log } from "./logging"

const FIELD = "comment_generations_used"

// Read-only lookup for displaying "X of Y used" in the UI - never increments.
export async function getCommentUsage(
  userId: string,
  limit: number
): Promise<{ current: number; limit: number }> {
  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from("plan_usage")
    .select(FIELD)
    .eq("user_id", userId)
    .maybeSingle()
  const current = (row as Record<string, number> | null)?.[FIELD] ?? 0
  return { current, limit }
}

// Tracks the Comment Generator's own monthly quota against the optional
// plan_usage.comment_generations_used column (see migration 0042). Kept
// separate from lib/server/plan-limits-v2.ts's incrementUsage so this
// purely-additive feature never touches the shared Feature/FIELD_MAP/RPC path.
export async function reserveCommentUsage(
  userId: string,
  limit: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc("reserve_comment_generation", {
    p_user_id: userId,
    p_limit: limit,
  })
  const result = Array.isArray(data) ? data[0] : data
  if (!error && result && typeof result.allowed === "boolean" && typeof result.current === "number") {
    return { allowed: result.allowed, current: result.current, limit }
  }

  log.error("comment_usage.reserve_failed", { userId, error: error?.message })
  // Fail closed. A quota outage must not create unbounded AI spend.
  return { allowed: false, current: limit, limit }
}

export async function releaseCommentUsage(userId: string): Promise<void> {
  const { error } = await createServiceClient().rpc("release_comment_generation", { p_user_id: userId })
  if (error) log.error("comment_usage.release_failed", { userId, error: error.message })
}

// Kept as a compatibility alias for callers updated in separate deployments.
export const checkAndIncrementCommentUsage = reserveCommentUsage
