import { NextRequest } from "next/server"
import { requireAppSession } from "@/lib/server/app-session"
import { supabaseSelect } from "@/lib/server/supabase-rest"

export type WorkspaceRole = "super_admin" | "agency_admin" | "editor" | "client_reviewer" | "viewer"

type MembershipRow = {
  role: WorkspaceRole
  workspace_id: string | null
}

/**
 * Ordered from most to least privileged.
 * Any role at position N or lower implies all permissions of roles > N.
 */
const ROLE_HIERARCHY: WorkspaceRole[] = [
  "super_admin",
  "agency_admin",
  "editor",
  "client_reviewer",
  "viewer",
]

/**
 * Returns true if `userRole` meets or exceeds `requiredRole` in the hierarchy.
 */
export const hasPermission = (userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean => {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole)
  if (userIdx === -1) return false
  return userIdx <= requiredIdx
}

/**
 * Resolves the calling user's role in a specific workspace.
 * Throws "auth_required" if no session exists.
 * Throws "unauthorized_workspace" if the user has no membership.
 */
export const resolveWorkspaceMembership = async (
  request: NextRequest,
  workspaceId: string
): Promise<{ userId: string; role: WorkspaceRole }> => {
  const session = requireAppSession(request)

  const users = await supabaseSelect<{ id: string }>(
    "users",
    `email=eq.${encodeURIComponent(session.email)}&limit=1`
  )
  const userId = users?.[0]?.id
  if (!userId) throw new Error("auth_required")

  const memberships = await supabaseSelect<MembershipRow>(
    "memberships",
    `user_id=eq.${userId}&workspace_id=eq.${workspaceId}&limit=1`
  )

  if (!memberships?.length) {
    throw new Error("unauthorized_workspace")
  }

  return { userId, role: memberships[0].role }
}

/**
 * Convenience guard: resolves membership and throws "forbidden" if the
 * caller does not have at least `requiredRole`.
 */
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

/**
 * Maps error message strings to HTTP status codes for uniform API responses.
 */
export const errorToStatus = (msg: string): number => {
  if (msg === "auth_required") return 401
  if (msg === "forbidden") return 403
  if (msg === "unauthorized_workspace") return 403
  if (msg === "not_found") return 404
  return 500
}
