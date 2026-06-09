import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/server/auth-helpers"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { checkPlanLimit, decrementDraft } from "@/lib/server/plan-limits"
import { callAi } from "@/lib/server/ai-router"

// Future: POST /api/carousel/[id]/export?format=pdf - render slides via headless browser and return PDF blob

const schema = z.object({
  topic: z.string().min(3).max(200),
  role: z.string(),
  slideCount: z.number().min(5).max(10),
  tone: z.string().optional(),
})

type Slide = {
  title: string
  bullets: string[]
  designHint: string
}

function parseSlides(raw: string, count: number): Slide[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { slides?: unknown })?.slides)
      ? (parsed as { slides: unknown[] }).slides
      : []
  if (!Array.isArray(arr) || arr.length === 0) return []
  return arr.slice(0, count).map((slide: Partial<Slide>, i: number) => ({
    title: String(slide?.title ?? "").slice(0, 90) || `Slide ${i + 1}`,
    bullets: Array.isArray(slide?.bullets) ? slide.bullets.map(String).slice(0, 2) : [],
    designHint: String(slide?.designHint ?? "").slice(0, 180),
  }))
}

function enforceSlideStructure(slides: Slide[], topic: string): Slide[] {
  if (slides.length === 0) return slides
  // Slide 1: title slide
  slides[0] = { ...slides[0], designHint: slides[0].designHint || "title-slide", title: slides[0].title || topic }
  // Slide N: CTA slide
  const last = slides.length - 1
  slides[last] = {
    ...slides[last],
    designHint: slides[last].designHint || "cta-slide",
    title: slides[last].title || "Your next step",
    bullets: slides[last].bullets.length > 0 ? slides[last].bullets : ["Follow for more.", "Share this with your network."],
  }
  return slides
}

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json())
    const userId = await requireAuth()

    const limit = await checkPlanLimit(userId, "carousels")
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Carousel limit reached", current: limit.current, limit: limit.limit },
        { status: 403 }
      )
    }

    const systemPrompt = `Create a LinkedIn carousel outline. Each slide has a title and 1-2 bullet points. Total slides: ${body.slideCount}. Topic: ${body.topic}. Role: ${body.role}. Return JSON: { "slides": [{ "title": string, "bullets": string[], "designHint": string }] }`
    const userMessage = body.tone ? `Tone: ${body.tone}` : "Tone: practical and sharp"

    const result = await callAi(systemPrompt, userMessage, { json: true, temperature: 0.7, timeout: 20000 })

    let slides = parseSlides(result, body.slideCount)
    if (slides.length < 5) {
      return NextResponse.json({ error: "AI returned too few slides" }, { status: 502 })
    }
    slides = enforceSlideStructure(slides, body.topic)

    const supabase = createServiceClient()
    const { data: carousel, error: saveError } = await supabase
      .from("carousels")
      .insert({
        user_id: userId,
        topic: body.topic,
        role: body.role,
        tone: body.tone ?? null,
        slide_count: slides.length,
        slides,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (saveError || !carousel) throw new Error(saveError?.message ?? "carousel_save_failed")

    await decrementDraft(userId)

    return NextResponse.json({ id: carousel.id, slides })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid carousel input", issues: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "carousel_generation_failed"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, topic, role, slide_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return NextResponse.json({ carousels: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "carousel_fetch_failed"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
