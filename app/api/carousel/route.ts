import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/server/auth-helpers"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { checkPlanLimit } from "@/lib/server/plan-limits"
import { callAi } from "@/lib/server/ai-router"

const schema = z.object({
  topic: z.string().min(3).max(200),
  role: z.string().min(2).max(80).default("founder"),
  slideCount: z.number().int().min(5).max(10).default(7),
  tone: z.string().max(120).optional(),
})

type Slide = { title: string; bullets: string[]; designHint?: string }

const parseSlides = (raw: string, count: number): Slide[] => {
  const parsed = JSON.parse(raw)
  const slides = Array.isArray(parsed) ? parsed : parsed.slides
  if (!Array.isArray(slides)) throw new Error("invalid_slides")
  return slides.slice(0, count).map((slide: Partial<Slide>, index: number) => ({
    title: String(slide.title || (index === 0 ? "Title" : index === count - 1 ? "CTA" : `Slide ${index + 1}`)).slice(0, 90),
    bullets: Array.isArray(slide.bullets) ? slide.bullets.map(String).slice(0, 2) : [],
    designHint: String(slide.designHint || "").slice(0, 180),
  }))
}

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousel_projects")
      .select("id,title,role_profile,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return NextResponse.json({ carousels: data || [], exportFormats: ["json"], pdf: "future" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "carousel_fetch_failed"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json())
    const userId = await requireAuth()
    const limit = await checkPlanLimit(userId, "carousels")
    if (!limit.allowed) return NextResponse.json({ error: "Carousel limit reached", current: limit.current, limit: limit.limit }, { status: 403 })

    const systemPrompt = `Create a LinkedIn carousel outline. Each slide should have a title and 1-2 bullet points. Total slides: ${body.slideCount}. Topic: ${body.topic}. Role: ${body.role}. Return JSON: { "slides": [{ "title": "", "bullets": [], "designHint": "" }] }.`
    const result = await callAi(systemPrompt, body.tone ? `Tone: ${body.tone}` : "Tone: practical and sharp", { json: true, temperature: 0.7, timeout: 20000 })
    const slides = parseSlides(result, body.slideCount)
    if (slides.length < 5) return NextResponse.json({ error: "AI returned too few slides" }, { status: 502 })

    slides[0].title ||= body.topic
    slides[slides.length - 1].title ||= "Your next step"
    const qualityScore = Math.min(95, Math.max(50, 60 + slides.filter((s) => s.bullets.length).length * 5))

    const supabase = createServiceClient()
    const { data: project, error: projectError } = await supabase
      .from("carousel_projects")
      .insert({ user_id: userId, title: body.topic, role_profile: body.role, quality_score: qualityScore })
      .select()
      .single()
    if (projectError || !project) throw new Error(projectError?.message || "carousel_save_failed")

    const { error: slidesError } = await supabase.from("carousel_slides").insert(
      slides.map((slide, index) => ({
        project_id: project.id,
        slide_number: index + 1,
        title: slide.title,
        content: slide.bullets.join("\n"),
        image_prompt: slide.designHint || "",
      }))
    )
    if (slidesError) throw new Error(slidesError.message)

    return NextResponse.json({
      id: project.id,
      carousel: { ...project, slides, qualityScore },
      exportFormats: ["json"],
      pdf: "future",
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid carousel input" }, { status: 400 })
    const message = error instanceof Error ? error.message : "carousel_generation_failed"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
