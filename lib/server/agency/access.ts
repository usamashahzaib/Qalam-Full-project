import "server-only"

import { NextResponse } from "next/server"
import { getWorkspaceSessionContext, type WorkspaceSessionContext } from "@/lib/server/workspace"
import { hasPermission, errorToStatus, type WorkspaceRole } from "@/lib/server/roles"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import { isUuid, inList, issuePublicToken, hashPublicToken } from "@/lib/server/agency/ids"
import { isTransientError } from "@/lib/server/transient-errors"
import { log } from "@/lib/server/logging"

export type AgencyWorkspace = {
  id: string
  name: string
  owner_id: string | null
  workspace_type: "personal" | "client"
  archived_at: string | null
  branding_color: string | null
  client_contact_name: string | null
  client_contact_email: string | null
  cadence_posts_per_week: number
  auto_approve_hours: number | null
  voice_drop_enabled: boolean
  voice_passport_summary: string | null
}

export type MemberWorkspace = AgencyWorkspace & { role: WorkspaceRole }

export const WORKSPACE_COLUMNS =
  "id,name,owner_id,workspace_type,archived_at,branding_color,client_contact_name,client_contact_email,cadence_posts_per_week,auto_approve_hours,voice_drop_enabled,voice_passport_summary"

export { isUuid, inList, issuePublicToken, hashPublicToken }

export async function listMemberWorkspaces(userId: string): Promise<MemberWorkspace[]> {
  const memberships = await supabaseSelect<{ workspace_id: string; role: WorkspaceRole }>(
    "workspace_members",
    `user_id=eq.${encodeURIComponent(userId)}&select=workspace_id,role`
  )
  const ids = [...new Set((memberships || []).map((row) => row.workspace_id).filter(isUuid))]
  if (!ids.length) return []
  const workspaces = await supabaseSelect<AgencyWorkspace>(
    "workspaces",
    `id=in.${inList(ids)}&select=${WORKSPACE_COLUMNS}`
  )
  const roleById = new Map((memberships || []).map((row) => [row.workspace_id, row.role]))
  return (workspaces || []).map((workspace) => ({ ...workspace, role: roleById.get(workspace.id) ?? "viewer" }))
}

export type WorkspaceAccess = {
  ctx: WorkspaceSessionContext
  workspace: AgencyWorkspace
  role: WorkspaceRole
}

/**
 * Session + membership + role check for a specific workspace id taken from
 * the URL. Client-only features pass `clientOnly` so a personal workspace can
 * never be turned into a handoff or proof target.
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  required: WorkspaceRole,
  options: { clientOnly?: boolean; allowArchived?: boolean } = {}
): Promise<WorkspaceAccess> {
  if (!isUuid(workspaceId)) throw new Error("not_found")
  const ctx = await getWorkspaceSessionContext().catch((error) => {
    if (isTransientError(error)) throw error
    throw new Error("auth_required")
  })
  const [memberships, workspaces] = await Promise.all([
    supabaseSelect<{ role: WorkspaceRole }>(
      "workspace_members",
      `user_id=eq.${encodeURIComponent(ctx.supabaseUserId)}&workspace_id=eq.${workspaceId}&select=role&limit=1`
    ),
    supabaseSelect<AgencyWorkspace>("workspaces", `id=eq.${workspaceId}&select=${WORKSPACE_COLUMNS}&limit=1`),
  ])
  const membership = memberships?.[0]
  const workspace = workspaces?.[0]
  if (!membership || !workspace) throw new Error("unauthorized_workspace")
  if (!hasPermission(membership.role, required)) throw new Error("forbidden")
  if (options.clientOnly && workspace.workspace_type !== "client") throw new Error("client_workspace_required")
  if (!options.allowArchived && workspace.archived_at) throw new Error("workspace_archived")
  return { ctx, workspace, role: membership.role }
}

export function agencyErrorResponse(error: unknown, scope: string) {
  const message = (error as Error)?.message || "server_error"
  const known: Record<string, number> = {
    client_workspace_required: 400,
    workspace_archived: 409,
    invalid_input: 400,
    upgrade_required: 403,
    rate_limited: 429,
  }
  const status = known[message] ?? errorToStatus(message)
  if (status >= 500) log.error(`${scope}.failed`, { error: message })
  return NextResponse.json({ error: status >= 500 && !isTransientError(error) ? "server_error" : message }, { status })
}

export const isLive = (row: { expires_at: string; revoked_at?: string | null }, now = Date.now()) =>
  !row.revoked_at && Date.parse(row.expires_at) > now
