import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseSelect, supabasePatch } from "@/lib/server/supabase-rest"
import { errorToStatus } from "@/lib/server/roles"

type DbPost = { id: string; scheduled_time: string | null; status: string; workspace_id: string }

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)

    const body = await request.json()
    const postId = String(body.postId || "").trim()
    const date = String(body.date || "").trim() // YYYY-MM-DD

    if (!postId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "postId and date (YYYY-MM-DD) required" }, { status: 400 })
    }

    const rows = await supabaseSelect<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!rows?.length) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const existing = rows[0]
    const existingTime = existing.scheduled_time?.slice(11, 16) || "09:00"
    const newScheduledTime = `${date}T${existingTime}:00`

    const updated = await supabasePatch<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}`, {
      scheduled_time: newScheduledTime,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ post: updated?.[0] || null })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
