import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { errorToStatus } from "@/lib/server/roles"

type DbPost = { id: string; workspace_id: string }

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

    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 })

    const rows = await supabaseSelect<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!rows?.length) return NextResponse.json({ error: "not_found" }, { status: 404 })

    await supabasePatch("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}`, {
      scheduled_for: null,
      status: "draft",
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
