import "server-only"

import { env } from "@/lib/server/env"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { summarizeCadence } from "@/lib/agency/health"
import { buildProofSnapshot, type ProofMetrics, type ProofSnapshot } from "@/lib/agency/proof"
import { hashPublicToken, inList, isUuid, issuePublicToken, type AgencyWorkspace } from "@/lib/server/agency/access"

const PROOF_TTL_DAYS = 90
export const PROOF_DAILY_LIMIT = 10
const DAY_MS = 24 * 60 * 60 * 1000

type ReportRow = {
  id: string
  workspace_id: string
  created_by: string | null
  period_start: string
  period_end: string
  snapshot: ProofSnapshot
  expires_at: string
  revoked_at: string | null
  view_count: number
  last_viewed_at: string | null
  created_at: string
}

const LIST_COLUMNS = "id,workspace_id,created_by,period_start,period_end,expires_at,revoked_at,view_count,last_viewed_at,created_at"

export async function collectProofSnapshot(workspace: AgencyWorkspace, days: number, now = new Date()): Promise<ProofSnapshot> {
  const periodEnd = now
  const periodStart = new Date(now.getTime() - days * DAY_MS)
  const historyStart = new Date(now.getTime() - 26 * 7 * DAY_MS)

  const [posts, history, approvals] = await Promise.all([
    supabaseSelect<{ id: string; title: string | null; content: string | null; published_at: string; linkedin_post_id: string | null }>(
      "posts",
      `workspace_id=eq.${workspace.id}&status=eq.published&published_at=gte.${encodeURIComponent(periodStart.toISOString())}&published_at=lte.${encodeURIComponent(periodEnd.toISOString())}&select=id,title,content,published_at,linkedin_post_id&order=published_at.desc&limit=200`
    ),
    supabaseSelect<{ published_at: string }>(
      "posts",
      `workspace_id=eq.${workspace.id}&status=eq.published&published_at=gte.${encodeURIComponent(historyStart.toISOString())}&select=published_at&limit=2000`
    ),
    supabaseSelect<{ created_at: string; decided_at: string | null; auto_approved: boolean; status: string }>(
      "approvals",
      `workspace_id=eq.${workspace.id}&created_at=gte.${encodeURIComponent(periodStart.toISOString())}&select=created_at,decided_at,auto_approved,status&limit=1000`
    ),
  ])

  const postIds = (posts || []).map((post) => post.id).filter(isUuid)
  const snapshots = postIds.length
    ? await supabaseSelect<ProofMetrics & { post_id: string; captured_at: string }>(
        "analytics_snapshots",
        `post_id=in.${inList(postIds)}&select=post_id,impressions,reactions,comments,reposts,captured_at&order=captured_at.desc&limit=2000`
      )
    : []
  const latest = new Map<string, ProofMetrics>()
  for (const row of snapshots || []) {
    if (!latest.has(row.post_id)) latest.set(row.post_id, { impressions: row.impressions, reactions: row.reactions, comments: row.comments, reposts: row.reposts })
  }

  const cadence = summarizeCadence({
    publishedAt: (history || []).map((post) => post.published_at),
    scheduledFor: [],
    target: workspace.cadence_posts_per_week,
    now,
  })

  return buildProofSnapshot({
    workspaceName: workspace.name,
    brandingColor: workspace.branding_color,
    cadenceTarget: workspace.cadence_posts_per_week,
    streakWeeks: cadence.streakWeeks,
    periodStart,
    periodEnd,
    posts: posts || [],
    metricsByPostIndex: (posts || []).map((post) => latest.get(post.id) ?? null),
    approvals: approvals || [],
  }, now)
}

export async function createProofReport(workspace: AgencyWorkspace, days: number, createdBy: string) {
  return storeProofReport(workspace, await collectProofSnapshot(workspace, days), createdBy)
}

export async function storeProofReport(workspace: AgencyWorkspace, snapshot: ProofSnapshot, createdBy: string | null) {
  const { token, hash } = issuePublicToken()
  const rows = await supabaseInsert<ReportRow>("client_proof_reports", {
    workspace_id: workspace.id,
    token_hash: hash,
    created_by: createdBy,
    period_start: snapshot.periodStart,
    period_end: snapshot.periodEnd,
    snapshot,
    expires_at: new Date(Date.now() + PROOF_TTL_DAYS * DAY_MS).toISOString(),
  })
  const row = rows?.[0]
  if (!row) throw new Error("proof_create_failed")
  const { snapshot: _omit, ...listed } = row
  void _omit
  return { report: listed, url: `${env.frontendOrigin}/proof/${token}`, snapshot }
}

export async function listProofReports(workspaceId: string) {
  return (await supabaseSelect<Omit<ReportRow, "snapshot">>("client_proof_reports", `workspace_id=eq.${workspaceId}&select=${LIST_COLUMNS}&order=created_at.desc&limit=20`)) || []
}

export async function countRecentProofReports(workspaceId: string) {
  const since = new Date(Date.now() - DAY_MS).toISOString()
  const rows = await supabaseSelect<{ id: string }>("client_proof_reports", `workspace_id=eq.${workspaceId}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${PROOF_DAILY_LIMIT + 1}`)
  return rows?.length ?? 0
}

export async function revokeProofReport(workspaceId: string, reportId: string) {
  if (!isUuid(reportId)) throw new Error("not_found")
  const rows = await supabasePatch("client_proof_reports", `id=eq.${reportId}&workspace_id=eq.${workspaceId}&revoked_at=is.null`, { revoked_at: new Date().toISOString() })
  if (!rows?.length) throw new Error("not_found")
}

export async function loadPublicProof(token: string): Promise<ProofSnapshot | null> {
  const hash = hashPublicToken(token)
  if (!hash) return null
  const rows = await supabaseSelect<ReportRow>("client_proof_reports", `token_hash=eq.${hash}&select=id,snapshot,expires_at,revoked_at&limit=1`)
  const row = rows?.[0]
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null
  await createServiceClient().rpc("record_public_view", { p_table: "client_proof_reports", p_id: row.id }).then(undefined, () => undefined)
  return row.snapshot
}
