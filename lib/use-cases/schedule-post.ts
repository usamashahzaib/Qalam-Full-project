import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

export interface SchedulePostInput {
  postId: string
  scheduledAt: string
  userId: string
}

export interface SchedulePostOutput {
  success: boolean
}

export async function schedulePost(input: SchedulePostInput): Promise<Result<SchedulePostOutput>> {
  const { postId, scheduledAt, userId } = input
  if (!postId || !scheduledAt || !userId) return err({ code: "VALIDATION_ERROR", message: "postId, scheduledAt, and userId are required" })

  const scheduled = new Date(scheduledAt)
  if (Number.isNaN(scheduled.getTime())) return err({ code: "VALIDATION_ERROR", message: "scheduledAt must be a valid date" })

  try {
    const { data, error } = await createServiceClient()
      .from("posts")
      .update({ status: "scheduled", scheduled_time: scheduled.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", postId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle()

    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })
    if (!data) return err({ code: "NOT_FOUND", message: "Post not found" })
    return ok({ success: true })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to schedule post", cause })
  }
}
