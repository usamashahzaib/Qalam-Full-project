import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

export type Workspace = {
  id: string
  name: string | null
  owner_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ManageWorkspaceInput {
  action: "create" | "update" | "delete"
  workspaceId?: string
  userId: string
}

export interface ManageWorkspaceOutput {
  workspace: Workspace
}

export async function manageWorkspace(input: ManageWorkspaceInput): Promise<Result<ManageWorkspaceOutput>> {
  const { action, workspaceId, userId } = input
  if (!userId) return err({ code: "VALIDATION_ERROR", message: "userId is required" })
  if (action !== "create" && !workspaceId) return err({ code: "VALIDATION_ERROR", message: "workspaceId is required" })

  try {
    const supabase = createServiceClient()
    if (action === "create") {
      const { data, error } = await supabase.rpc("create_workspace_with_member", { p_user_id: userId, p_name: "Workspace", p_role: "owner" })
      if (error || !data) return err({ code: "INTERNAL_ERROR", message: error?.message || "Failed to create workspace" })

      const { data: workspace } = await supabase.from("workspaces").select("id, name, owner_id, created_at, updated_at").eq("id", data).maybeSingle()
      return workspace ? ok({ workspace: workspace as Workspace }) : ok({ workspace: { id: data as string, name: "Workspace", owner_id: userId } })
    }

    const { data: existing, error: findError } = await supabase
      .from("workspaces")
      .select("id, name, owner_id, created_at, updated_at")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .maybeSingle()
    if (findError) return err({ code: "INTERNAL_ERROR", message: findError.message })
    if (!existing) return err({ code: "NOT_FOUND", message: "Workspace not found" })

    if (action === "delete") {
      const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId).eq("owner_id", userId)
      return error ? err({ code: "INTERNAL_ERROR", message: error.message }) : ok({ workspace: existing as Workspace })
    }

    const { data, error } = await supabase
      .from("workspaces")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .select("id, name, owner_id, created_at, updated_at")
      .maybeSingle()
    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })
    return data ? ok({ workspace: data as Workspace }) : err({ code: "NOT_FOUND", message: "Workspace not found" })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to manage workspace", cause })
  }
}
