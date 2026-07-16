import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { CAROUSEL_THEMES, DEFAULT_THEME_ID, resolveTheme, type CarouselThemeId } from "@/lib/carousel-design"
import { buildCarouselPdf, type CarouselPdfSlide } from "@/lib/server/carousel-pdf"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    if (!planCheck.limits.canExport) {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "export" }, { status: 403 })
    }

    const { id } = await context.params

    const body = await req.json().catch(() => ({}))
    const rawThemeId = body.themeId as CarouselThemeId
    const themeId: CarouselThemeId = CAROUSEL_THEMES[rawThemeId] ? rawThemeId : (DEFAULT_THEME_ID as CarouselThemeId)
    const customAccent = typeof body.customAccent === "string" && body.customAccent ? body.customAccent : undefined
    const theme = resolveTheme(themeId, customAccent)

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, topic, role, tone, slides, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Carousel not found" }, { status: 404 })

    const rawSlides: CarouselPdfSlide[] = Array.isArray(data.slides) ? data.slides : []
    if (!rawSlides.length) return NextResponse.json({ error: "No slides found" }, { status: 404 })

    const pdfBytes = Buffer.from(await buildCarouselPdf(rawSlides, theme))
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carousel-${id.slice(0, 8)}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    })
  })(request)
}
