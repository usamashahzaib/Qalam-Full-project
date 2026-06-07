import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/server/auth-helpers"
import { supabaseSelect } from "@/lib/server/supabase-rest"

export type WorkspaceRole = "owner" | "admin" | "super_admin" | "agency_admin" | "editor" | "client_reviewer" | "viewer" | "member"

type MembershipRow = {
  role: WorkspaceRole
  workspace_id: string | null
}

const ROLE_HIERARCHY: WorkspaceRole[] = [
  "owner",
  "admin",
  "super_admin",
  "agency_admin",
  "editor",
  "client_reviewer",
  "viewer",
  "member",
]

export const hasPermission = (userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean => {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole)
  if (userIdx === -1) return false
  return userIdx <= requiredIdx
}

export const resolveWorkspaceMembership = async (
  request: NextRequest,
  workspaceId: string
): Promise<{ userId: string; role: WorkspaceRole }> => {
  const userId = await requireAuth().catch(() => {
    throw new Error("auth_required")
  })

  const memberships = await supabaseSelect<MembershipRow>(
    "workspace_members",
    `user_id=eq.${encodeURIComponent(userId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=role,workspace_id&limit=1`
  )

  if (!memberships?.length) {
    throw new Error("unauthorized_workspace")
  }

  return { userId, role: memberships[0].role }
}

export const requireRole = async (
  request: NextRequest,
  workspaceId: string,
  requiredRole: WorkspaceRole
): Promise<{ userId: string; role: WorkspaceRole }> => {
  const membership = await resolveWorkspaceMembership(request, workspaceId)
  if (!hasPermission(membership.role, requiredRole)) {
    throw new Error("forbidden")
  }
  return membership
}

export const errorToStatus = (msg: string): number => {
  if ((msg === "auth_required" || msg === "Unauthorized")) return 401
  if (msg === "forbidden") return 403
  if (msg === "unauthorized_workspace") return 403
  if (msg === "not_found") return 404
  return 500
}
