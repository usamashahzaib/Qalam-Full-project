import "server-only"

import { supabaseSelect } from "@/lib/server/supabase-rest"
import { linkedInStatus, type LinkedInStatus } from "@/lib/agency/health"
import { inList } from "@/lib/server/agency/access"

type AccountRow = {
  workspace_id: string
  expires_at: string | null
  refresh_token_expires_at: string | null
  refresh_token: string | null
}

export type WorkspaceLinkedIn = { status: LinkedInStatus; expiresAt: string | null }

/**
 * A live refresh token means the publish path renews access on its own, so
 * the access-token expiry alone is not a reason to bother the client.
 */
export function effectiveExpiry(row: Pick<AccountRow, "expires_at" | "refresh_token" | "refresh_token_expires_at">, now = Date.now()): string | null {
  if (row.refresh_token && row.refresh_token_expires_at && Date.parse(row.refresh_token_expires_at) > now) {
    return row.refresh_token_expires_at
  }
  return row.expires_at
}

export async function getLinkedInByWorkspace(workspaceIds: string[], now = new Date()): Promise<Map<string, WorkspaceLinkedIn>> {
  const result = new Map<string, WorkspaceLinkedIn>()
  if (!workspaceIds.length) return result
  const rows = await supabaseSelect<AccountRow>(
    "publishing_accounts",
    `workspace_id=in.${inList(workspaceIds)}&provider=eq.linkedin&select=workspace_id,expires_at,refresh_token,refresh_token_expires_at`
  )
  const byWorkspace = new Map((rows || []).map((row) => [row.workspace_id, row]))
  for (const id of workspaceIds) {
    const row = byWorkspace.get(id)
    const expiresAt = row ? effectiveExpiry(row, now.getTime()) : null
    result.set(id, { status: linkedInStatus(expiresAt, Boolean(row), now), expiresAt })
  }
  return result
}

export async function getLinkedInPublishingAccountSummary(workspaceId: string): Promise<LinkedInStatus> {
  const statuses = await getLinkedInByWorkspace([workspaceId])
  return statuses.get(workspaceId)?.status ?? { state: "missing" }
}
