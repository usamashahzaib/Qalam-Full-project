import { err, ok } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function canAccessPost(userId: string, postId: string): Promise<Result<boolean>> {
  if (!userId || !postId) return err({ code: "VALIDATION_ERROR", message: "userId and postId are required" })

  try {
    const { data, error } = await createServiceClient()
      .from("posts")
      .select("workspace_id")
      .eq("id", postId)
      .maybeSingle()

    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })
    if (!data?.workspace_id) return ok(false)

    return canAccessWorkspace(userId, data.workspace_id)
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to check post access", cause })
  }
}

export async function canAccessWorkspace(userId: string, workspaceId: string): Promise<Result<boolean>> {
  if (!userId || !workspaceId) return err({ code: "VALIDATION_ERROR", message: "userId and workspaceId are required" })

  try {
    const { data, error } = await createServiceClient()
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()

    return error ? err({ code: "INTERNAL_ERROR", message: error.message }) : ok(Boolean(data))
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to check workspace access", cause })
  }
}
