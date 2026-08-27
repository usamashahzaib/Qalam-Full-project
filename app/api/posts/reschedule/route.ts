import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { errorToStatus, requireRole } from "@/lib/server/roles"
import { attachQstashSchedule } from "@/lib/server/qstash"

type DbPost = { id: string; scheduled_for: string | null; status: string; workspace_id: string }

const requestSchema = z.object({
  postId: z.string().uuid("postId must be a valid UUID"),
  date: z.iso.date("date must use YYYY-MM-DD"),
})

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const { requirePlan } = await import("@/lib/server/require-plan")
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response
    if (!planCheck.limits.scheduling) {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "scheduling" }, { status: 403 })
    }

    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 })
    }
    const { postId, date } = parsed.data
    const scoped = createScopedClient(workspaceId)

    const { data: existingRaw } = await scoped.from("posts").select("id, scheduled_for, status, workspace_id").eq("id", postId).limit(1).maybeSingle()
    if (!existingRaw) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const existing = existingRaw as unknown as DbPost
    const existingTime = existing.scheduled_for?.slice(11, 16) || "09:00"
    const newScheduledTime = `${date}T${existingTime}:00`
    if (new Date(newScheduledTime).getTime() <= Date.now()) {
      return NextResponse.json({ error: "scheduled_time_must_be_future" }, { status: 400 })
    }

    // Never flip a post that is mid-publish or already live back to
    // "scheduled" - that would make the safety-net cron publish it again.
    // The status filter makes the update conditional, so this also holds
    // against a concurrent claim by the publish worker.
    if (existing.status === "publishing" || existing.status === "published") {
      return NextResponse.json({ error: "post_not_reschedulable" }, { status: 409 })
    }
    const { data: updated } = await scoped
      .from("posts")
      .update({ scheduled_for: newScheduledTime, status: "scheduled", updated_at: new Date().toISOString() })
      .eq("id", postId)
      .not("status", "in", "(publishing,published)")
      .select("id, scheduled_for, status, workspace_id")
      .maybeSingle()
    if (!updated) {
      return NextResponse.json({ error: "post_not_reschedulable" }, { status: 409 })
    }

    await attachQstashSchedule(postId, new Date(newScheduledTime)).catch((err) =>
      console.error("posts.reschedule.qstash_attach_failed", postId, (err as Error).message)
    )

    return NextResponse.json({ post: updated })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
