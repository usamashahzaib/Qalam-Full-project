import "server-only"

import { env } from "@/lib/server/env"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { storeLinkedInPublishingAccount } from "@/lib/server/linkedin-credentials"
import { createNotification } from "@/lib/server/notifications"
import { log } from "@/lib/server/logging"
import type { LinkedInConnection } from "@/lib/server/linkedin-oauth"
import { hashPublicToken, issuePublicToken, isUuid } from "@/lib/server/agency/access"
import { handoffEmail, sendAgencyEmail } from "@/lib/server/agency/emails"

export const HANDOFF_TTL_DAYS = 7
export const HANDOFF_DAILY_LIMIT = 20

export type HandoffRow = {
  id: string
  workspace_id: string
  recipient_name: string | null
  recipient_email: string | null
  created_by: string | null
  source: "manual" | "guardian"
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_at: string
}

const HANDOFF_COLUMNS = "id,workspace_id,recipient_name,recipient_email,created_by,source,expires_at,used_at,revoked_at,created_at"

export const handoffUrl = (token: string) => `${env.frontendOrigin}/connect/${token}`

export type HandoffStatus = "ready" | "used" | "expired" | "revoked"

export function handoffStatus(row: Pick<HandoffRow, "expires_at" | "used_at" | "revoked_at">, now = Date.now()): HandoffStatus {
  if (row.revoked_at) return "revoked"
  if (row.used_at) return "used"
  if (Date.parse(row.expires_at) <= now) return "expired"
  return "ready"
}

export async function listHandoffLinks(workspaceId: string) {
  const rows = await supabaseSelect<HandoffRow>(
    "workspace_handoff_links",
    `workspace_id=eq.${workspaceId}&select=${HANDOFF_COLUMNS}&order=created_at.desc&limit=20`
  )
  return (rows || []).map((row) => ({ ...row, status: handoffStatus(row) }))
}

export async function createHandoffLink(input: {
  workspaceId: string
  workspaceName: string
  createdBy: string | null
  inviterName: string
  recipientName?: string | null
  recipientEmail?: string | null
  source: "manual" | "guardian"
  sendEmail: boolean
}) {
  const { token, hash } = issuePublicToken()
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_DAYS * 24 * 60 * 60 * 1000)
  const rows = await supabaseInsert<HandoffRow>("workspace_handoff_links", {
    workspace_id: input.workspaceId,
    token_hash: hash,
    recipient_name: input.recipientName || null,
    recipient_email: input.recipientEmail || null,
    created_by: input.createdBy,
    source: input.source,
    expires_at: expiresAt.toISOString(),
  })
  const row = rows?.[0]
  if (!row) throw new Error("handoff_create_failed")
  const url = handoffUrl(token)
  const emailed = input.sendEmail
    ? await sendAgencyEmail(input.recipientEmail, handoffEmail({
        recipientName: input.recipientName,
        inviterName: input.inviterName,
        workspaceName: input.workspaceName,
        url,
        expiresAt,
        reason: input.source,
      }), "agency.handoff")
    : false
  return { link: { ...row, status: handoffStatus(row) }, url, emailed }
}

export async function countRecentHandoffs(workspaceId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const rows = await supabaseSelect<{ id: string }>(
    "workspace_handoff_links",
    `workspace_id=eq.${workspaceId}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${HANDOFF_DAILY_LIMIT + 1}`
  )
  return rows?.length ?? 0
}

export async function revokeHandoffLink(workspaceId: string, linkId: string) {
  if (!isUuid(linkId)) throw new Error("not_found")
  const rows = await supabasePatch<HandoffRow>(
    "workspace_handoff_links",
    `id=eq.${linkId}&workspace_id=eq.${workspaceId}&used_at=is.null&revoked_at=is.null`,
    { revoked_at: new Date().toISOString() }
  )
  if (!rows?.length) throw new Error("not_found")
}

export type PublicHandoff = {
  row: HandoffRow
  workspaceName: string
  inviterName: string | null
}

export async function loadHandoffByToken(token: string): Promise<PublicHandoff | null> {
  const hash = hashPublicToken(token)
  if (!hash) return null
  const rows = await supabaseSelect<HandoffRow>("workspace_handoff_links", `token_hash=eq.${hash}&select=${HANDOFF_COLUMNS}&limit=1`)
  const row = rows?.[0]
  if (!row) return null
  const [workspaces, inviters] = await Promise.all([
    supabaseSelect<{ name: string | null; archived_at: string | null }>("workspaces", `id=eq.${row.workspace_id}&select=name,archived_at&limit=1`),
    row.created_by
      ? supabaseSelect<{ full_name: string | null }>("users", `id=eq.${row.created_by}&select=full_name&limit=1`).catch(() => [])
      : Promise.resolve([] as { full_name: string | null }[]),
  ])
  const workspace = workspaces?.[0]
  if (!workspace || workspace.archived_at) return null
  return { row, workspaceName: workspace.name || "your workspace", inviterName: inviters?.[0]?.full_name || null }
}

/**
 * Claim first, store second. The conditional PATCH on used_at is the
 * single-use guard: two tabs racing through LinkedIn's consent screen with
 * the same link cannot both attach an account.
 */
export async function completeHandoff(handoffId: string, connection: LinkedInConnection) {
  const claimed = await supabasePatch<HandoffRow>(
    "workspace_handoff_links",
    `id=eq.${handoffId}&used_at=is.null&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
    { used_at: new Date().toISOString() }
  )
  const row = claimed?.[0]
  if (!row) throw new Error("handoff_unavailable")

  try {
    await storeLinkedInPublishingAccount({
      workspaceId: row.workspace_id,
      accessToken: connection.accessToken,
      memberId: connection.memberId,
      tokenExpiresAt: connection.expiresAt,
      refreshToken: connection.refreshToken,
      refreshTokenExpiresAt: connection.refreshTokenExpiresAt,
    })
  } catch (error) {
    await supabasePatch("workspace_handoff_links", `id=eq.${row.id}`, { used_at: null }).catch(() => undefined)
    throw error
  }

  const [workspaces, managers] = await Promise.all([
    supabaseSelect<{ name: string | null; owner_id: string | null }>("workspaces", `id=eq.${row.workspace_id}&select=name,owner_id&limit=1`).catch(() => []),
    supabaseSelect<{ user_id: string }>("workspace_members", `workspace_id=eq.${row.workspace_id}&role=in.(owner,admin)&select=user_id`).catch(() => []),
  ])
  const workspaceName = workspaces?.[0]?.name || "a client workspace"
  const recipients = new Set([...(managers || []).map((member) => member.user_id), row.created_by].filter(isUuid))
  await Promise.all([...recipients].map((userId) => createNotification({
    userId,
    workspaceId: row.workspace_id,
    type: "linkedin_connected",
    title: `LinkedIn connected for ${workspaceName}`,
    body: `${connection.displayName || "The client"} approved access. Scheduled posts can publish automatically.`,
    link: `/agency?client=${row.workspace_id}`,
  })))
  log.info("agency.handoff_completed", { workspaceId: row.workspace_id, source: row.source })
  return { workspaceId: row.workspace_id, workspaceName }
}
