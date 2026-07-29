import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { errorToStatus, requireRole } from "@/lib/server/roles"
import { detachQstashSchedule } from "@/lib/server/qstash"

type DbPost = { id: string; workspace_id: string }

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

    const body = await request.json()
    const postId = String(body.postId || "").trim()

    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 })

    const rows = await supabaseSelect<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!rows?.length) return NextResponse.json({ error: "not_found" }, { status: 404 })

    // Conditional update: never demote a post that is mid-publish or already
    // live to "draft" - the LinkedIn share may be (or already is) out, and a
    // draft could be re-scheduled into a duplicate publish.
    const updated = await supabasePatch("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&status=not.in.(publishing,published)`, {
      scheduled_for: null,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    if (!updated?.length) {
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
