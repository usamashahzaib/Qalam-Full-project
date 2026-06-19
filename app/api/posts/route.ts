import { NextRequest, NextResponse } from "next/server"
import { log } from "@/lib/server/logging"
import { requireAuth, resolveWorkspaceId, getWorkspaceSessionContext } from "@/lib/server/workspace"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"

const postRepo = new SupabasePostRepository()

const VALID_STATUSES = ["draft", "pending_approval", "approved", "rejected", "scheduled", "published", "failed"]

const validateSchedule = (status: string, scheduledTime?: string | null) => {
  if (status !== "scheduled") return null
  if (!scheduledTime) return "scheduled_time_required"
  const selected = new Date(scheduledTime)
  if (Number.isNaN(selected.getTime())) return "invalid_scheduled_time"
  return selected.getTime() <= Date.now() ? "scheduled_time_must_be_future" : null
}

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    log.info("posts.get.start", { reqId })
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const posts = await postRepo.list(workspaceId)
    log.info("posts.get.done", { reqId, count: posts.length })
    return NextResponse.json({ posts })
  } catch (error) {
    const msg = (error as Error).message
    log.error("posts.get.error", { reqId, error: msg })
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    log.info("posts.post.start", { reqId })
    const userId = await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const ctx = await getWorkspaceSessionContext()

    const body = await request.json()
    const { title, content, type = "linkedin", status, scheduledTime, publishedAt, externalPostUrn } = body
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }

    const safeStatus = VALID_STATUSES.includes(status) ? status : "draft"
    const scheduleError = validateSchedule(safeStatus, scheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
    if (safeStatus === "scheduled") {
      const planCheck = await requirePlan(request, "Solo")
      if (!planCheck.ok) return planCheck.response
      if (!planCheck.limits.scheduling) {
        return NextResponse.json({ error: "upgrade_required", requiredFeature: "scheduling" }, { status: 403 })
      }
    }

    const post = await postRepo.create({
      userId: ctx.supabaseUserId,
      workspaceId,
      authorId: ctx.supabaseUserId,
      title,
      content,
      type,
      status: safeStatus,
      scheduledTime,
      publishedAt,
      externalPostUrn,
    })
    log.info("posts.post.done", { reqId, postId: post.id })
    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    log.error("posts.post.error", { reqId, error: msg })
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

export async function PATCH(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const existing = await postRepo.get(id, workspaceId)
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const body = await request.json()
    const { title, content, type, status, scheduledTime, publishedAt, externalPostUrn } = body
    const nextStatus = status !== undefined && VALID_STATUSES.includes(status) ? status : existing.status
    const nextScheduledTime = scheduledTime !== undefined ? scheduledTime : existing.scheduled_for
    const scheduleError = validateSchedule(nextStatus, nextScheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
    const wantsScheduling = nextStatus === "scheduled"
    if (wantsScheduling) {
      const planCheck = await requirePlan(request, "Solo")
      if (!planCheck.ok) return planCheck.response
      if (!planCheck.limits.scheduling) return NextResponse.json({ error: "upgrade_required", requiredFeature: "scheduling" }, { status: 403 })
    }

    const patch: Record<string, unknown> = {}
    if (title !== undefined) patch.title = title
    if (content !== undefined) patch.content = content
    if (type !== undefined) patch.type = type
    if (status !== undefined && VALID_STATUSES.includes(status)) patch.status = status
    if (scheduledTime !== undefined) patch.scheduledTime = scheduledTime
    if (publishedAt !== undefined) patch.publishedAt = publishedAt
    if (externalPostUrn !== undefined) patch.externalPostUrn = externalPostUrn

    const post = await postRepo.update(id, workspaceId, patch)
    log.info("posts.patch.done", { reqId, id })
    return NextResponse.json({ post })
  } catch (error) {
    const msg = (error as Error).message
    log.error("posts.patch.error", { reqId, error: msg })
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

export async function DELETE(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const existing = await postRepo.get(id, workspaceId)
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 })

    await postRepo.delete(id, workspaceId)
    log.info("posts.delete.done", { reqId, id })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    const msg = (error as Error).message
    log.error("posts.delete.error", { reqId, error: msg })
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
