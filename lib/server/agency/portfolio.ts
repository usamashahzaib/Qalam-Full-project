import "server-only"

import { supabaseSelect } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"
import {
  clientExceptions,
  healthLevel,
  summarizeCadence,
  type CadenceSummary,
  type ClientException,
  type LinkedInStatus,
} from "@/lib/agency/health"
import { inList, type MemberWorkspace } from "@/lib/server/agency/access"
import { getLinkedInByWorkspace } from "@/lib/server/agency/linkedin-status"

const DAY_MS = 24 * 60 * 60 * 1000

export type ClientHealth = {
  id: string
  name: string
  role: MemberWorkspace["role"]
  brandingColor: string | null
  cadence: CadenceSummary
  linkedIn: LinkedInStatus
  pendingApprovals: number
  oldestPendingHours: number | null
  failedPosts: number
  scheduledAtRisk: number
  unusedVoiceDrops: number
  nextScheduledAt: string | null
  exceptions: ClientException[]
  health: ReturnType<typeof healthLevel>
  settings: {
    cadencePostsPerWeek: number
    autoApproveHours: number | null
    voiceDropEnabled: boolean
    hasClientContactEmail: boolean
  }
}

type PublishedRow = { workspace_id: string; published_at: string | null }
type OpenPostRow = { workspace_id: string; status: string; scheduled_for: string | null; updated_at: string }
type PendingRow = { workspace_id: string; created_at: string }
type DropRow = { workspace_id: string }

/** Optional tables (added by the agency migration) degrade to empty instead of failing the whole view. */
async function optionalSelect<T>(table: string, query: string): Promise<T[]> {
  try {
    return (await supabaseSelect<T>(table, query)) || []
  } catch (error) {
    log.warn("agency.portfolio_optional_query_failed", { table, error: (error as Error).message })
    return []
  }
}

export async function buildClientHealth(workspaces: MemberWorkspace[], now = new Date()): Promise<ClientHealth[]> {
  const clients = workspaces.filter((workspace) => workspace.workspace_type === "client" && !workspace.archived_at)
  if (!clients.length) return []
  const ids = clients.map((workspace) => workspace.id)
  const historyStart = new Date(now.getTime() - 26 * 7 * DAY_MS).toISOString()
  const failedSince = new Date(now.getTime() - 14 * DAY_MS).toISOString()

  const [published, openPosts, pending, drops, linkedIn] = await Promise.all([
    supabaseSelect<PublishedRow>(
      "posts",
      `workspace_id=in.${inList(ids)}&status=eq.published&published_at=gte.${encodeURIComponent(historyStart)}&select=workspace_id,published_at&limit=5000`
    ),
    supabaseSelect<OpenPostRow>(
      "posts",
      `workspace_id=in.${inList(ids)}&status=in.(scheduled,failed)&select=workspace_id,status,scheduled_for,updated_at&limit=2000`
    ),
    supabaseSelect<PendingRow>(
      "approvals",
      `workspace_id=in.${inList(ids)}&status=eq.pending&select=workspace_id,created_at&limit=2000`
    ),
    optionalSelect<DropRow>(
      "client_voice_drops",
      `workspace_id=in.${inList(ids)}&answered_at=not.is.null&used_at=is.null&dismissed_at=is.null&select=workspace_id&limit=2000`
    ),
    getLinkedInByWorkspace(ids, now),
  ])

  return clients.map((workspace) => {
    const mine = <T extends { workspace_id: string }>(rows: T[] | null) => (rows || []).filter((row) => row.workspace_id === workspace.id)
    const scheduled = mine(openPosts).filter((post) => post.status === "scheduled" && post.scheduled_for)
    const upcoming = scheduled.filter((post) => Date.parse(post.scheduled_for as string) >= now.getTime())
    const cadence = summarizeCadence({
      publishedAt: mine(published).map((post) => post.published_at).filter((value): value is string => Boolean(value)),
      scheduledFor: upcoming.map((post) => post.scheduled_for as string),
      target: workspace.cadence_posts_per_week ?? 3,
      now,
    })
    const account = linkedIn.get(workspace.id) ?? { status: { state: "missing" } as LinkedInStatus, expiresAt: null }
    const expiry = account.expiresAt ? Date.parse(account.expiresAt) : null
    const scheduledAtRisk = scheduled.filter((post) => {
      if (account.status.state === "missing" || account.status.state === "expired") return true
      return expiry !== null && Date.parse(post.scheduled_for as string) >= expiry
    }).length
    const pendingRows = mine(pending)
    const oldestPending = pendingRows.reduce<number | null>((oldest, row) => {
      const created = Date.parse(row.created_at)
      return oldest === null || created < oldest ? created : oldest
    }, null)
    const failedPosts = mine(openPosts).filter((post) => post.status === "failed" && post.updated_at >= failedSince).length
    const nextScheduledAt = upcoming.map((post) => post.scheduled_for as string).sort()[0] ?? null

    const base = {
      workspaceId: workspace.id,
      name: workspace.name,
      cadence,
      linkedIn: account.status,
      pendingApprovals: pendingRows.length,
      oldestPendingHours: oldestPending === null ? null : Math.max(0, (now.getTime() - oldestPending) / (60 * 60 * 1000)),
      failedPosts,
      scheduledAtRisk,
      unusedVoiceDrops: mine(drops).length,
    }
    const exceptions = clientExceptions(base)
    return {
      id: workspace.id,
      name: workspace.name,
      role: workspace.role,
      brandingColor: workspace.branding_color,
      cadence,
      linkedIn: account.status,
      pendingApprovals: base.pendingApprovals,
      oldestPendingHours: base.oldestPendingHours,
      failedPosts,
      scheduledAtRisk,
      unusedVoiceDrops: base.unusedVoiceDrops,
      nextScheduledAt,
      exceptions,
      health: healthLevel(exceptions),
      settings: {
        cadencePostsPerWeek: workspace.cadence_posts_per_week ?? 3,
        autoApproveHours: workspace.auto_approve_hours ?? null,
        voiceDropEnabled: Boolean(workspace.voice_drop_enabled),
        hasClientContactEmail: Boolean(workspace.client_contact_email),
      },
    }
  })
}
