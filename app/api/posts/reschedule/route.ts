import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { errorToStatus } from "@/lib/server/roles"
import { attachQstashSchedule } from "@/lib/server/qstash"

type DbPost = { id: string; scheduled_for: string | null; status: string; workspace_id: string }

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const { requirePlan } = await import("@/lib/server/plan-limits-v2")
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response
    if (!planCheck.limits.scheduling) {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "scheduling" }, { status: 403 })
    }

    const workspaceId = await resolveWorkspaceId(request)

    const body = await request.json()
    const postId = String(body.postId || "").trim()
    const date = String(body.date || "").trim() // YYYY-MM-DD

    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime())
    if (!postId || !dateValid) {
      return NextResponse.json({ error: "postId and date (YYYY-MM-DD) required" }, { status: 400 })
    }

    const rows = await supabaseSelect<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!rows?.length) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const existing = rows[0]
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
    const updated = await supabasePatch<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&status=not.in.(publishing,published)`, {
      scheduled_for: newScheduledTime,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    if (!updated?.length) {
      return NextResponse.json({ error: "post_not_reschedulable" }, { status: 409 })
    }

    await attachQstashSchedule(postId, new Date(newScheduledTime)).catch((err) =>
      console.error("posts.reschedule.qstash_attach_failed", postId, (err as Error).message)
    )

    return NextResponse.json({ post: updated?.[0] || null })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
