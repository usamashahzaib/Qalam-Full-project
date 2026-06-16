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
    const supabase = createServiceClient()

    const { data: member, error } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()

    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })
    if (member) return ok(true)

    // Fallback: workspace_members row may be missing for the owner if provisioning raced.
    // Check workspaces.owner_id directly so owners are never falsely denied.
    const { data: owned } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .maybeSingle()

    return ok(Boolean(owned))
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to check workspace access", cause })
  }
}
