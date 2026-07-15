import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"

type DbSlide = { title: string; bullets: string[]; designHint: string }

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; slideId: string }> }
) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id: carouselId, slideId } = await context.params
    const slideIndex = parseInt(slideId, 10)

    if (isNaN(slideIndex)) {
      return NextResponse.json({ error: "Invalid slide id" }, { status: 400 })
    }

    // Workspace scoping instead of user_id: a teammate must be able to edit
    // a carousel another member created inside the same client workspace.
    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "editor")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("slides")
      .eq("id", carouselId)
      .eq("workspace_id", workspaceId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const slides: DbSlide[] = [...((data as { slides: DbSlide[] }).slides || [])]
    if (slideIndex >= slides.length) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 })
    }

    const body = await req.json() as { title?: string; content?: string }
    const slide = { ...slides[slideIndex] }
    if (body.title !== undefined) slide.title = body.title
    if (body.content !== undefined) {
      slide.bullets = body.content ? body.content.split("\n").filter(Boolean) : []
    }
    slides[slideIndex] = slide

    await supabase
      .from("carousels")
      .update({ slides, updated_at: new Date().toISOString() })
      .eq("id", carouselId)
      .eq("workspace_id", workspaceId)

    return NextResponse.json({
      slide: {
        id: slideId,
        carousel_id: carouselId,
        order_index: slideIndex,
        title: slide.title || null,
        content: Array.isArray(slide.bullets) ? slide.bullets.join("\n") : null,
        image_url: null,
      },
    })
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; slideId: string }> }
) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id: carouselId, slideId } = await context.params
    const slideIndex = parseInt(slideId, 10)

    if (isNaN(slideIndex)) {
      return NextResponse.json({ error: "Invalid slide id" }, { status: 400 })
    }

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "editor")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("slides")
      .eq("id", carouselId)
      .eq("workspace_id", workspaceId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const slides: DbSlide[] = [...((data as { slides: DbSlide[] }).slides || [])]
    if (slides.length <= 2) {
      return NextResponse.json({ error: "Cannot delete - minimum 2 slides required" }, { status: 400 })
    }
    if (slideIndex >= slides.length) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 })
    }

    const updated = slides.filter((_, i) => i !== slideIndex)

    await supabase
      .from("carousels")
      .update({ slides: updated, slide_count: updated.length, updated_at: new Date().toISOString() })
      .eq("id", carouselId)
      .eq("workspace_id", workspaceId)

    return NextResponse.json({ ok: true, slideCount: updated.length })
  })(request)
}
