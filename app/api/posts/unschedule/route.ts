import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { errorToStatus, requireRole } from "@/lib/server/roles"
import { detachQstashSchedule } from "@/lib/server/qstash"

const requestSchema = z.object({ postId: z.string().uuid("postId must be a valid UUID") })

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
    const { postId } = parsed.data
    const scoped = createScopedClient(workspaceId)

    const { data: existing } = await scoped.from("posts").select("id, workspace_id").eq("id", postId).limit(1).maybeSingle()
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 })

    // Conditional update: never demote a post that is mid-publish or already
    // live to "draft" - the LinkedIn share may be (or already is) out, and a
    // draft could be re-scheduled into a duplicate publish.
    const { data: updated } = await scoped
      .from("posts")
      .update({ scheduled_for: null, status: "draft", updated_at: new Date().toISOString() })
      .eq("id", postId)
      .not("status", "in", "(publishing,published)")
      .select("id")
      .maybeSingle()
    if (!updated) {
      return NextResponse.json({ error: "post_not_unschedulable" }, { status: 409 })
    }

    await detachQstashSchedule(postId).catch((err) =>
      console.error("posts.unschedule.qstash_detach_failed", postId, (err as Error).message)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
