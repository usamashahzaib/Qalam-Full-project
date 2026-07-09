import "server-only"

import { createServiceClient } from "./supabase-rest"
import { log } from "./logging"

const FIELD = "comment_generations_used"
const MAX_ATTEMPTS = 3

// Tracks the Comment Generator's own monthly quota against the optional
// plan_usage.comment_generations_used column (see migration 0042). Kept
// separate from lib/server/plan-limits-v2.ts's incrementUsage so this
// purely-additive feature never touches the shared Feature/FIELD_MAP/RPC path.
export async function checkAndIncrementCommentUsage(
  userId: string,
  limit: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = createServiceClient()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data: row } = await supabase
      .from("plan_usage")
      .select(FIELD)
      .eq("user_id", userId)
      .maybeSingle()

    const current = (row as Record<string, number> | null)?.[FIELD] ?? 0
    if (current >= limit) {
      return { allowed: false, current, limit }
    }

    if (!row) {
      const { error } = await supabase
        .from("plan_usage")
        .upsert({ user_id: userId, plan: "free", [FIELD]: 1 }, { onConflict: "user_id" })
      if (!error) return { allowed: true, current: 1, limit }
      continue
    }

    const { data: updated } = await supabase
      .from("plan_usage")
      .update({ [FIELD]: current + 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq(FIELD, current)
      .select(FIELD)
      .maybeSingle()

    if (updated) {
      return { allowed: true, current: current + 1, limit }
    }
    // Another request updated the row between our read and write - retry.
  }

  log.error("comment_usage.increment_failed", { userId })
  return { allowed: false, current: limit, limit }
}
