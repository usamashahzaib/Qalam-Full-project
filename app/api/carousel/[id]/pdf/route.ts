import { NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { requireAuth } from "@/lib/server/clerk-client"
import { createClient } from "@supabase/supabase-js"

type Slide = {
  slide_number: number
  title: string | null
  content: string | null
  image_prompt: string | null
}

const wrap = (text: string, max = 56) => text.split(/\s+/).filter(Boolean).reduce<string[]>((lines, word) => {
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: project } = await supabase
      .from("carousel_projects")
      .select("id,title,user_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (!project) return NextResponse.json({ error: "Carousel not found" }, { status: 404 })

    const { data: slides, error } = await supabase
      .from("carousel_slides")
      .select("slide_number,title,content,image_prompt")
      .eq("project_id", id)
      .order("slide_number", { ascending: true })

    if (error || !slides?.length) return NextResponse.json({ error: "No slides found" }, { status: 404 })

    const pdf = await PDFDocument.create()
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

    ;(slides as Slide[]).forEach((slide, index) => {
      const page = pdf.addPage([1080, 1080])
      page.drawRectangle({ x: 0, y: 0, width: 1080, height: 1080, color: rgb(0.965, 0.965, 0.955) })
      page.drawText(`Slide ${index + 1}/${slides.length}`, { x: 72, y: 970, size: 18, font: bold, color: rgb(0.05, 0.29, 0.27) })
      page.drawText(String(slide.title || `Slide ${index + 1}`).slice(0, 72), { x: 72, y: 875, size: 48, font: bold, color: rgb(0.07, 0.07, 0.08), maxWidth: 900 })
      wrap(String(slide.content || ""), 56).slice(0, 8).forEach((line, i) => {
        page.drawText(line, { x: 72, y: 760 - i * 42, size: 28, font: regular, color: rgb(0.18, 0.18, 0.2) })
      })
      page.drawRectangle({ x: 72, y: 130, width: 936, height: 120, color: rgb(0.88, 0.94, 0.92) })
      page.drawText(`Visual: ${String(slide.image_prompt || "Simple editorial layout").slice(0, 120)}`, { x: 96, y: 188, size: 18, font: regular, color: rgb(0.08, 0.26, 0.24) })
      page.drawText("Qalam", { x: 72, y: 72, size: 18, font: bold, color: rgb(0.05, 0.29, 0.27) })
    })

    const pdfUrl = `data:application/pdf;base64,${Buffer.from(await pdf.save()).toString("base64")}`
    await supabase.from("carousel_projects").update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId)
    return NextResponse.json({ pdfUrl })
  } catch (error) {
    const message = (error as Error).message || "Failed to generate PDF"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
