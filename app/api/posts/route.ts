import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/auth-helpers"
import { resolveWorkspaceId, getAuthContext } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { createServiceClient, supabaseDelete, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { createClient } from "@supabase/supabase-js"

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

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: "Failed to load posts" }, { status: 500 })
    return NextResponse.json({ posts })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()

    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const ctx = await getAuthContext()
    const authorId = ctx.supabaseUserId

    const body = await request.json()
    const { title, content, type, status, scheduledTime, publishedAt, externalPostUrn } = body
    if (!title || !type) {
      return NextResponse.json({ error: "title and type are required" }, { status: 400 })
    }

    const validStatuses = ["draft", "pending_approval", "approved", "rejected", "scheduled", "published", "failed"]
    const safeStatus = validStatuses.includes(status) ? status : "draft"
    const scheduleError = validateSchedule(safeStatus, scheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })

    const supabase = createServiceClient()
    const dbStatus = ["draft", "published", "scheduled", "archived"].includes(safeStatus) ? safeStatus : "draft"
    const { data: postId, error } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_title: title,
      p_content: content ?? "",
      p_hook: null,
      p_cta: null,
      p_role_profile: null,
      p_topic: title,
      p_engagement_score: null,
      p_metadata: { type, scheduledTime, publishedAt, externalPostUrn, status: safeStatus, authorId },
      p_status: dbStatus,
    })
    if (error || !postId) throw new Error(error?.message || "post_create_failed")

    return NextResponse.json({
      post: {
        id: postId,
        title,
        content: content ?? "",
        type,
        status: safeStatus,
        date: (scheduledTime || publishedAt || new Date().toISOString()).slice(0, 10),
        scheduledTime: scheduledTime ?? null,
        externalPostUrn: externalPostUrn ?? null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 })
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
