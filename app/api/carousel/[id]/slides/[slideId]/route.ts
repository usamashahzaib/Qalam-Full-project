import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

type DbCarouselSlide = {
  id: string
  carousel_id: string
  order_index: number
  title: string | null
  content: string | null
  image_url: string | null
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const { id: carouselId, slideId } = await context.params

    const projects = await supabaseSelect<{ id: string }>(
      "carousel_projects",
      `id=eq.${carouselId}&workspace_id=eq.${workspaceId}&limit=1`
    )
    if (!projects?.length) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    // ── Role check: editor or above to edit slides ──────────────────────
    await requireRole(request, workspaceId, "editor")
    // ────────────────────────────────────────────────────────────

    const body = await request.json()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) patch.title = body.title
    if (body.content !== undefined) patch.content = body.content

    const rows = await supabasePatch<DbCarouselSlide>(
      "carousel_slides",
      `id=eq.${slideId}&carousel_id=eq.${carouselId}`,
      patch
    )

    return NextResponse.json({ slide: rows?.[0] || null })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
