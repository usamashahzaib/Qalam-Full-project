import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"

type DbSlide = { title: string; bullets: string[]; designHint?: string }

function mapSlides(carouselId: string, rawSlides: unknown) {
  if (!Array.isArray(rawSlides)) return []
  return rawSlides.map((s: DbSlide, i: number) => ({
    id: String(i),
    carousel_id: carouselId,
    order_index: i,
    title: s?.title || `Slide ${i + 1}`,
    content: Array.isArray(s?.bullets) && s.bullets.length
      ? s.bullets.join("\n")
      : s?.designHint || null,
    image_url: null,
  }))
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id } = await context.params

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, user_id, topic, role, tone, slide_count, slides, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      console.error("[carousel GET]", id, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    return NextResponse.json({
      project: {
        id: data.id,
        workspace_id: null,
        post_id: null,
        theme: data.tone || data.role || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      slides: mapSlides(data.id, data.slides),
    })
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id } = await context.params

    const supabase = createServiceClient()
    const { error } = await supabase
      .from("carousels")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  })(request)
}
