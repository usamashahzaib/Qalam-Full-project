import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId, requireAppSession } from "@/lib/server/app-session"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

type DbPost = {
  id: string
  workspace_id: string
  author_id: string | null
  title: string
  content: string | null
  type: string
  status: string
  scheduled_time: string | null
  published_at: string | null
  external_post_urn: string | null
  created_at: string
  updated_at: string
}

const toClientPost = (post: DbPost) => ({
  id: post.id,
  title: post.title,
  content: post.content ?? "",
  type: post.type,
  status: post.status,
  date: (post.scheduled_time || post.published_at || post.created_at || "").slice(0, 10),
  scheduledTime: post.scheduled_time,
  externalPostUrn: post.external_post_urn,
  updatedAt: post.updated_at,
  createdAt: post.created_at,
})

const validateSchedule = (status: string, scheduledTime?: string | null) => {
  if (status !== "scheduled") return null
  if (!scheduledTime) return "scheduled_time_required"
  const selected = new Date(scheduledTime)
  if (Number.isNaN(selected.getTime())) return "invalid_scheduled_time"
  return selected.getTime() <= Date.now() ? "scheduled_time_must_be_future" : null
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 500)

    let query = `workspace_id=eq.${workspaceId}&order=updated_at.desc&limit=${limit}`
    if (status) query += `&status=eq.${encodeURIComponent(status)}`

    const rows = await supabaseSelect<DbPost>("posts", query)
    return NextResponse.json({ posts: (rows || []).map(toClientPost) })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: msg === "auth_required" ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const session = requireAppSession(request)
    const users = await supabaseSelect<{ id: string }>("users", `email=eq.${encodeURIComponent(session.email)}&limit=1`)
    const authorId = users?.[0]?.id ?? null

    const body = await request.json()
    const { title, content, type, status, scheduledTime, publishedAt, externalPostUrn } = body
    if (!title || !type) {
      return NextResponse.json({ error: "title and type are required" }, { status: 400 })
    }

    const validStatuses = ["draft", "pending_approval", "approved", "rejected", "scheduled", "published", "failed"]
    const safeStatus = validStatuses.includes(status) ? status : "draft"
    const scheduleError = validateSchedule(safeStatus, scheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })

    const rows = await supabaseInsert<DbPost>(
      "posts",
      {
        workspace_id: workspaceId,
        author_id: authorId,
        title,
        content: content ?? "",
        type,
        status: safeStatus,
        scheduled_time: scheduledTime ?? null,
        published_at: publishedAt ?? null,
        external_post_urn: externalPostUrn ?? null,
      },
      "return=representation"
    )

    return NextResponse.json({ post: rows?.[0] ? toClientPost(rows[0]) : null }, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const existing = await supabaseSelect<DbPost>("posts", `id=eq.${id}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!existing?.length) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, type, status, scheduledTime, publishedAt, externalPostUrn } = body
    const validStatuses = ["draft", "pending_approval", "approved", "rejected", "scheduled", "published", "failed"]
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const nextStatus = status !== undefined && validStatuses.includes(status) ? status : existing[0].status
    const nextScheduledTime = scheduledTime !== undefined ? scheduledTime : existing[0].scheduled_time
    const scheduleError = validateSchedule(nextStatus, nextScheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
    if (title !== undefined) patch.title = title
    if (content !== undefined) patch.content = content
    if (type !== undefined) patch.type = type
    if (status !== undefined && validStatuses.includes(status)) patch.status = status
    if (scheduledTime !== undefined) patch.scheduled_time = scheduledTime
    if (publishedAt !== undefined) patch.published_at = publishedAt
    if (externalPostUrn !== undefined) patch.external_post_urn = externalPostUrn

    const rows = await supabasePatch<DbPost>("posts", `id=eq.${id}&workspace_id=eq.${workspaceId}`, patch)
    return NextResponse.json({ post: rows?.[0] ? toClientPost(rows[0]) : null })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const existing = await supabaseSelect<{ id: string }>("posts", `id=eq.${id}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!existing?.length) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    await supabaseDelete("posts", `id=eq.${id}`)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
