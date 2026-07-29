import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"

export type WorkspaceRole = "owner" | "admin" | "editor" | "client_reviewer" | "viewer"

type MembershipRow = {
  role: WorkspaceRole
  workspace_id: string | null
}

const ROLE_HIERARCHY: WorkspaceRole[] = [
  "owner",
  "admin",
  "editor",
  "client_reviewer",
  "viewer",
]

export const hasPermission = (userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean => {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole)
  if (userIdx === -1) return false
  return userIdx <= requiredIdx
}

export const resolveWorkspaceMembership = async (
  _request: NextRequest,
  workspaceId: string
): Promise<{ userId: string; role: WorkspaceRole }> => {
  // Use supabaseUserId (internal UUID) - requireAuth() returns the session token ID
  // which is the LinkedIn external ID for OAuth users, but workspace_members stores
  // the internal Supabase UUID. Using getWorkspaceSessionContext().supabaseUserId
  // ensures consistent lookups for both credentials and OAuth users.
  const ctx = await getWorkspaceSessionContext().catch(() => {
    throw new Error("auth_required")
  })
  const userId = ctx.supabaseUserId

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

export const authorizeRole = async (
  request: NextRequest,
  workspaceId: string,
  requiredRole: WorkspaceRole
): Promise<NextResponse | null> => {
  try {
    await requireRole(request, workspaceId, requiredRole)
    return null
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }
}

export const errorToStatus = (msg: string): number => {
  if ((msg === "auth_required" || msg === "Unauthorized")) return 401
  if (msg === "forbidden") return 403
  if (msg === "unauthorized_workspace") return 403
  if (msg === "not_found") return 404
  return 500
}
