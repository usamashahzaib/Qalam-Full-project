import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

export interface AdminOverrideUserInput {
  targetUserId: string
  planOverride?: "Free" | "Solo" | "Pro" | "Agency" | null
  draftLimit?: number | null
  featureFlags?: Record<string, boolean>
  adminId: string
}

export interface AdminOverrideUserOutput {
  success: boolean
}

export async function adminOverrideUser(input: AdminOverrideUserInput): Promise<Result<AdminOverrideUserOutput>> {
  const { targetUserId, planOverride, draftLimit, featureFlags, adminId } = input
  if (!targetUserId || !adminId) return err({ code: "VALIDATION_ERROR", message: "targetUserId and adminId are required" })

  try {
    const supabase = createServiceClient()
    const payload = {
      user_id: targetUserId,
      plan_override: planOverride ?? null,
      draft_limit_override: draftLimit ?? null,
      feature_flags: featureFlags || {},
      notes: `Updated by admin ${adminId}`,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from("user_overrides").upsert(payload, { onConflict: "user_id" })
    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })

    if (planOverride) {
      await supabase.from("plan_usage").upsert({ user_id: targetUserId, plan: planOverride.toLowerCase() }, { onConflict: "user_id" })
    }
    return ok({ success: true })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to override user", cause })
  }
}
