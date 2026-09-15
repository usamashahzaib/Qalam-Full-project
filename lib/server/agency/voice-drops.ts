import "server-only"

import { env } from "@/lib/server/env"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { createNotification } from "@/lib/server/notifications"
import { hashPublicToken, isUuid, issuePublicToken } from "@/lib/server/agency/access"
import { sendAgencyEmail, voiceDropEmail } from "@/lib/server/agency/emails"

export const VOICE_DROP_TTL_DAYS = 14
export const VOICE_DROP_DAILY_LIMIT = 10

export type VoiceDropRow = {
  id: string
  workspace_id: string
  question: string
  recipient_email: string
  created_by: string | null
  source: "manual" | "weekly"
  expires_at: string
  answer: string | null
  answer_kind: "text" | "voice" | null
  answered_at: string | null
  used_at: string | null
  dismissed_at: string | null
  created_at: string
}

const COLUMNS = "id,workspace_id,question,recipient_email,created_by,source,expires_at,answer,answer_kind,answered_at,used_at,dismissed_at,created_at"

export type VoiceDropStatus = "waiting" | "answered" | "used" | "dismissed" | "expired"

export function voiceDropStatus(row: Pick<VoiceDropRow, "answered_at" | "used_at" | "dismissed_at" | "expires_at">, now = Date.now()): VoiceDropStatus {
  if (row.dismissed_at) return "dismissed"
  if (row.used_at) return "used"
  if (row.answered_at) return "answered"
  if (Date.parse(row.expires_at) <= now) return "expired"
  return "waiting"
}

export async function listVoiceDrops(workspaceId: string) {
  const rows = await supabaseSelect<VoiceDropRow>("client_voice_drops", `workspace_id=eq.${workspaceId}&select=${COLUMNS}&order=created_at.desc&limit=50`)
  return (rows || []).map((row) => ({ ...row, status: voiceDropStatus(row) }))
}

export async function countRecentVoiceDrops(workspaceId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const rows = await supabaseSelect<{ id: string }>("client_voice_drops", `workspace_id=eq.${workspaceId}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${VOICE_DROP_DAILY_LIMIT + 1}`)
  return rows?.length ?? 0
}

export async function createVoiceDrop(input: {
  workspaceId: string
  workspaceName: string
  question: string
  recipientEmail: string
  createdBy: string | null
  askerName: string
  source: "manual" | "weekly"
}) {
  const { token, hash } = issuePublicToken()
  const rows = await supabaseInsert<VoiceDropRow>("client_voice_drops", {
    workspace_id: input.workspaceId,
    question: input.question,
    token_hash: hash,
    recipient_email: input.recipientEmail,
    created_by: input.createdBy,
    source: input.source,
    expires_at: new Date(Date.now() + VOICE_DROP_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  })
  const row = rows?.[0]
  if (!row) throw new Error("voice_drop_create_failed")
  const url = `${env.frontendOrigin}/drop/${token}`
  const emailed = await sendAgencyEmail(input.recipientEmail, voiceDropEmail({
    workspaceName: input.workspaceName,
    question: input.question,
    url,
    askerName: input.askerName,
  }), "agency.voice_drop")
  return { drop: { ...row, status: voiceDropStatus(row) }, url, emailed }
}

export async function updateVoiceDropState(workspaceId: string, dropId: string, state: "used" | "dismissed") {
  if (!isUuid(dropId)) throw new Error("not_found")
  const column = state === "used" ? "used_at" : "dismissed_at"
  const rows = await supabasePatch<VoiceDropRow>("client_voice_drops", `id=eq.${dropId}&workspace_id=eq.${workspaceId}`, { [column]: new Date().toISOString() })
  if (!rows?.length) throw new Error("not_found")
  return rows[0]
}

export type PublicVoiceDrop = { row: VoiceDropRow; workspaceName: string; askerName: string | null }

export async function loadVoiceDropByToken(token: string): Promise<PublicVoiceDrop | null> {
  const hash = hashPublicToken(token)
  if (!hash) return null
  const rows = await supabaseSelect<VoiceDropRow>("client_voice_drops", `token_hash=eq.${hash}&select=${COLUMNS}&limit=1`)
  const row = rows?.[0]
  if (!row) return null
  const [workspaces, askers] = await Promise.all([
    supabaseSelect<{ name: string | null; archived_at: string | null }>("workspaces", `id=eq.${row.workspace_id}&select=name,archived_at&limit=1`),
    row.created_by
      ? supabaseSelect<{ full_name: string | null }>("users", `id=eq.${row.created_by}&select=full_name&limit=1`).catch(() => [])
      : Promise.resolve([] as { full_name: string | null }[]),
  ])
  const workspace = workspaces?.[0]
  if (!workspace || workspace.archived_at) return null
  return { row, workspaceName: workspace.name || "your workspace", askerName: askers?.[0]?.full_name || null }
}

export async function answerVoiceDrop(drop: VoiceDropRow, answer: string, kind: "text" | "voice") {
  const rows = await supabasePatch<VoiceDropRow>(
    "client_voice_drops",
    `id=eq.${drop.id}&answered_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
    { answer, answer_kind: kind, answered_at: new Date().toISOString() }
  )
  if (!rows?.length) throw new Error("drop_unavailable")

  const members = await supabaseSelect<{ user_id: string; role: string }>(
    "workspace_members",
    `workspace_id=eq.${drop.workspace_id}&role=in.(owner,admin,editor)&select=user_id,role`
  ).catch(() => [])
  const recipients = new Set([...(members || []).map((member) => member.user_id), drop.created_by].filter(isUuid))
  await Promise.all([...recipients].map((userId) => createNotification({
    userId,
    workspaceId: drop.workspace_id,
    type: "voice_drop_answered",
    title: "A client answered your Voice Drop",
    body: drop.question,
    link: "/desk",
  })))
  return rows[0]
}
