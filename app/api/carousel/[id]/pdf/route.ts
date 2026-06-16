import { NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { requireAuth } from "@/lib/server/auth-helpers"
import { createServiceClient } from "@/lib/server/supabase-rest"

type DbSlide = { title?: string; bullets?: string[]; designHint?: string }

const wrap = (text: string, max = 56) =>
  text.split(/\s+/).filter(Boolean).reduce<string[]>((lines, word) => {
    const last = lines.at(-1) || ""
    if (!last || `${last} ${word}`.length > max) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
    return lines
  }, [])

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth()
    const { id } = await context.params

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, topic, role, tone, slides, created_at")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Carousel not found" }, { status: 404 })

    const rawSlides: DbSlide[] = Array.isArray(data.slides) ? data.slides : []
    if (!rawSlides.length) return NextResponse.json({ error: "No slides found" }, { status: 404 })

    const pdf = await PDFDocument.create()
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

    rawSlides.forEach((slide, index) => {
      const title = String(slide.title || `Slide ${index + 1}`)
      const content = Array.isArray(slide.bullets) ? slide.bullets.join("\n") : (slide.designHint || "")
      const imageHint = slide.designHint || ""

      const page = pdf.addPage([1080, 1080])
      page.drawRectangle({ x: 0, y: 0, width: 1080, height: 1080, color: rgb(0.965, 0.965, 0.955) })
      page.drawText(`Slide ${index + 1}/${rawSlides.length}`, {
        x: 72, y: 970, size: 18, font: bold, color: rgb(0.05, 0.29, 0.27),
      })
      page.drawText(title.slice(0, 72), {
        x: 72, y: 875, size: 48, font: bold, color: rgb(0.07, 0.07, 0.08), maxWidth: 900,
      })
      wrap(content, 56).slice(0, 8).forEach((line, i) => {
        page.drawText(line, { x: 72, y: 760 - i * 42, size: 28, font: regular, color: rgb(0.18, 0.18, 0.2) })
      })
      if (imageHint) {
        page.drawRectangle({ x: 72, y: 130, width: 936, height: 100, color: rgb(0.88, 0.94, 0.92) })
        page.drawText(`Visual: ${imageHint.slice(0, 120)}`, {
          x: 96, y: 188, size: 18, font: regular, color: rgb(0.08, 0.26, 0.24),
        })
      }
      page.drawText("Qalam - byqalam.com", { x: 72, y: 72, size: 18, font: bold, color: rgb(0.05, 0.29, 0.27) })
    })

    const pdfBytes = Buffer.from(await pdf.save())
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carousel-${id.slice(0, 8)}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate PDF"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
