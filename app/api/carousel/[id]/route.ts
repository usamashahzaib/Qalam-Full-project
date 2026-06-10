import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"

type DbCarouselProject = {
  id: string
  workspace_id: string
  post_id: string | null
  theme: string | null
  created_at: string
  updated_at: string
}

type DbCarouselSlide = {
  id: string
  carousel_id: string
  order_index: number
  title: string | null
  content: string | null
  image_url: string | null
  created_at: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const { id } = await context.params

    const projects = await supabaseSelect<DbCarouselProject>(
      "carousel_projects",
      `id=eq.${id}&workspace_id=eq.${workspaceId}&limit=1`
    )
    if (!projects?.length) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const slides = await supabaseSelect<DbCarouselSlide>(
      "carousel_slides",
      `carousel_id=eq.${id}&order=order_index.asc`
    )

    return NextResponse.json({ project: projects[0], slides: slides || [] })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}
