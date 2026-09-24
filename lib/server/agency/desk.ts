import "server-only"

import { supabaseSelect } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"
import { hasPermission } from "@/lib/server/roles"
import { parseStoredInlineComments, type InlineComment } from "@/lib/agency/red-pen"
import { inList, type MemberWorkspace } from "@/lib/server/agency/access"

const DAY_MS = 24 * 60 * 60 * 1000

export type DeskKind =
  | "failed"
  | "needs_revision"
  | "approved_ready"
  | "fresh_material"
  | "draft"
  | "awaiting_client"
  | "scheduled"

const DESK_ORDER: DeskKind[] = ["failed", "needs_revision", "approved_ready", "fresh_material", "draft", "awaiting_client", "scheduled"]

export type DeskItem = {
  id: string
  kind: DeskKind
  workspaceId: string
  workspaceName: string
  workspaceType: "personal" | "client"
  brandingColor: string | null
  title: string
  detail: string | null
  at: string
  postId: string | null
  approvalId: string | null
  inlineComments: InlineComment[]
  autoApproveAt: string | null
}

type PostRow = { id: string; workspace_id: string; title: string | null; content: string | null; status: string; scheduled_for: string | null; updated_at: string; metadata: Record<string, unknown> | null }
type ApprovalRow = { id: string; workspace_id: string; post_id: string | null; post_title: string | null; status: string; comment: string | null; inline_comments: unknown; auto_approve_at: string | null; created_at: string; updated_at: string | null; decided_at: string | null }
type DropRow = { id: string; workspace_id: string; question: string; answer: string | null; answered_at: string }

const titleOf = (title: string | null, content: string | null) =>
  title?.trim() || content?.trim().split("\n")[0]?.slice(0, 90) || "Untitled post"

export async function buildDesk(workspaces: MemberWorkspace[], now = new Date()) {
  const workable = workspaces.filter((workspace) => !workspace.archived_at && hasPermission(workspace.role, "editor"))
  if (!workable.length) return { items: [] as DeskItem[], counts: emptyCounts() }
  const ids = workable.map((workspace) => workspace.id)
  const byId = new Map(workable.map((workspace) => [workspace.id, workspace]))
  const recent = new Date(now.getTime() - 30 * DAY_MS).toISOString()
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS).toISOString()

  const [posts, approvals, drops] = await Promise.all([
    supabaseSelect<PostRow>(
      "posts",
      `workspace_id=in.${inList(ids)}&or=${encodeURIComponent(`(and(status.in.(draft,rejected,approved,failed),updated_at.gte."${recent}"),and(status.eq.scheduled,scheduled_for.gte."${now.toISOString()}",scheduled_for.lte."${weekAhead}"))`)}&select=id,workspace_id,title,content,status,scheduled_for,updated_at,metadata&order=updated_at.desc&limit=400`
    ),
    supabaseSelect<ApprovalRow>(
      "approvals",
      `workspace_id=in.${inList(ids)}&or=${encodeURIComponent(`(status.eq.pending,and(status.eq.rejected,updated_at.gte."${recent}"))`)}&select=id,workspace_id,post_id,post_title,status,comment,inline_comments,auto_approve_at,created_at,updated_at,decided_at&order=created_at.desc&limit=400`
    ),
    supabaseSelect<DropRow>(
      "client_voice_drops",
      `workspace_id=in.${inList(ids)}&answered_at=not.is.null&used_at=is.null&dismissed_at=is.null&select=id,workspace_id,question,answer,answered_at&order=answered_at.desc&limit=100`
    ).catch((error) => {
      log.warn("agency.desk_drops_unavailable", { error: (error as Error).message })
      return [] as DropRow[]
    }),
  ])

  const items: DeskItem[] = []
  const base = (workspaceId: string) => {
    const workspace = byId.get(workspaceId)!
    return {
      workspaceId,
      workspaceName: workspace.workspace_type === "personal" ? "Personal" : workspace.name,
      workspaceType: workspace.workspace_type,
      brandingColor: workspace.branding_color,
      inlineComments: [] as InlineComment[],
      autoApproveAt: null as string | null,
      approvalId: null as string | null,
    }
  }

  const latestRejectionByPost = new Map<string, ApprovalRow>()
  for (const approval of approvals || []) {
    if (approval.status === "rejected" && approval.post_id && !latestRejectionByPost.has(approval.post_id)) {
      latestRejectionByPost.set(approval.post_id, approval)
    }
  }
  const pendingPostIds = new Set((approvals || []).filter((row) => row.status === "pending" && row.post_id).map((row) => row.post_id as string))

  for (const post of posts || []) {
    if (!byId.has(post.workspace_id)) continue
    const title = titleOf(post.title, post.content)
    const common = { ...base(post.workspace_id), id: `post:${post.id}`, postId: post.id, title }
    if (post.status === "failed") {
      const reason = typeof post.metadata?.last_publish_error === "string" ? post.metadata.last_publish_error : null
      items.push({ ...common, kind: "failed", detail: reason ? reason.replace(/_/g, " ") : "Publishing failed", at: post.updated_at })
    } else if (post.status === "rejected") {
      const rejection = latestRejectionByPost.get(post.id)
      items.push({
        ...common,
        kind: "needs_revision",
        detail: rejection?.comment || null,
        inlineComments: parseStoredInlineComments(rejection?.inline_comments),
        approvalId: rejection?.id ?? null,
        at: rejection?.decided_at || rejection?.updated_at || post.updated_at,
      })
    } else if (post.status === "approved") {
      items.push({ ...common, kind: "approved_ready", detail: "Approved. Schedule it or publish.", at: post.updated_at })
    } else if (post.status === "draft" && !pendingPostIds.has(post.id)) {
      items.push({ ...common, kind: "draft", detail: null, at: post.updated_at })
    } else if (post.status === "scheduled" && post.scheduled_for && Date.parse(post.scheduled_for) >= now.getTime()) {
      items.push({ ...common, kind: "scheduled", detail: null, at: post.scheduled_for })
    }
  }

  for (const approval of approvals || []) {
    if (approval.status !== "pending" || !byId.has(approval.workspace_id)) continue
    items.push({
      ...base(approval.workspace_id),
      id: `approval:${approval.id}`,
      kind: "awaiting_client",
      postId: approval.post_id,
      approvalId: approval.id,
      title: approval.post_title || "Untitled post",
      detail: null,
      autoApproveAt: approval.auto_approve_at,
      at: approval.created_at,
    })
  }

  for (const drop of drops || []) {
    if (!byId.has(drop.workspace_id)) continue
    items.push({
      ...base(drop.workspace_id),
      id: `drop:${drop.id}`,
      kind: "fresh_material",
      postId: null,
      title: drop.question,
      detail: drop.answer,
      at: drop.answered_at,
    })
  }

  const draftCap = new Map<string, number>()
  const filtered = items.filter((item) => {
    if (item.kind !== "draft") return true
    const count = (draftCap.get(item.workspaceId) ?? 0) + 1
    draftCap.set(item.workspaceId, count)
    return count <= 5
  })

  filtered.sort((a, b) => {
    const rank = DESK_ORDER.indexOf(a.kind) - DESK_ORDER.indexOf(b.kind)
    if (rank !== 0) return rank
    return a.kind === "scheduled" ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)
  })

  const counts = emptyCounts()
  for (const item of filtered) counts[item.kind]++
  return { items: filtered, counts }
}

const emptyCounts = (): Record<DeskKind, number> => ({
  failed: 0,
  needs_revision: 0,
  approved_ready: 0,
  fresh_material: 0,
  draft: 0,
  awaiting_client: 0,
  scheduled: 0,
})
