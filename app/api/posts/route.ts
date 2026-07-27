import { NextRequest, NextResponse } from "next/server"
import { log } from "@/lib/server/logging"
import { requireAuth, resolveWorkspaceId, getWorkspaceSessionContext } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"
import { attachQstashSchedule, detachQstashSchedule } from "@/lib/server/qstash"

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
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const ctx = await getWorkspaceSessionContext()

    const body = await request.json()
    const { title, content, type = "linkedin", status, scheduledTime, publishedAt, externalPostUrn, engagementScore } = body
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }

    const safeStatus = VALID_STATUSES.includes(status) ? status : "draft"
    const scheduleError = validateSchedule(safeStatus, scheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
    if (safeStatus === "scheduled") {
      const { requirePlan } = await import("@/lib/server/plan-limits-v2")
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
      engagementScore: typeof engagementScore === "number" ? engagementScore : null,
    })
    if (safeStatus === "scheduled" && scheduledTime) {
      await attachQstashSchedule(post.id, new Date(scheduledTime)).catch((err) =>
        log.error("posts.post.qstash_attach_failed", { reqId, postId: post.id, error: (err as Error).message })
      )
    }
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
    const { title, content, type, status, scheduledTime, publishedAt, externalPostUrn, engagementScore } = body
    // A post mid-publish must not change status or schedule from here - the
    // publish worker owns it until it lands on published/failed (or the
    // reconciler reverts it). Flipping it back to "scheduled" now would set
    // up a duplicate publish.
    if (existing.status === "publishing" && (status !== undefined || scheduledTime !== undefined)) {
      return NextResponse.json({ error: "post_is_publishing" }, { status: 409 })
    }
    const nextStatus = status !== undefined && VALID_STATUSES.includes(status) ? status : existing.status
    const nextScheduledTime = scheduledTime !== undefined ? scheduledTime : existing.scheduled_for
    const scheduleError = validateSchedule(nextStatus, nextScheduledTime)
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
    // PLAN GATE: transitioning to scheduled requires Solo+
    if (nextStatus === "scheduled" && existing.status !== "scheduled") {
      const { requirePlan } = await import("@/lib/server/plan-limits-v2")
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
    if (typeof engagementScore === "number") patch.engagementScore = engagementScore

    const post = await postRepo.update(id, workspaceId, patch)

    if (nextStatus === "scheduled" && nextScheduledTime) {
      await attachQstashSchedule(id, new Date(nextScheduledTime)).catch((err) =>
        log.error("posts.patch.qstash_attach_failed", { reqId, id, error: (err as Error).message })
      )
    } else if (existing.status === "scheduled" && nextStatus !== "scheduled") {
      await detachQstashSchedule(id).catch((err) =>
        log.error("posts.patch.qstash_detach_failed", { reqId, id, error: (err as Error).message })
      )
    }

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

    // Deleting a post mid-publish would orphan an in-flight LinkedIn share
    // (content goes live with no record on our side). The reconciler moves
    // stuck posts out of "publishing" within ~10 minutes, so ask the user to
    // retry after that instead.
    if (existing.status === "publishing") {
      return NextResponse.json({ error: "post_is_publishing" }, { status: 409 })
    }

    if (existing.status === "scheduled") {
      await detachQstashSchedule(id).catch((err) =>
        log.error("posts.delete.qstash_detach_failed", { reqId, id, error: (err as Error).message })
      )
    }

    await postRepo.delete(id, workspaceId)
    log.info("posts.delete.done", { reqId, id })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    const msg = (error as Error).message
    log.error("posts.delete.error", { reqId, error: msg })
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
