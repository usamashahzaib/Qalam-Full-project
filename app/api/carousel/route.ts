import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { checkPlanLimit, incrementUsage, requirePlan } from "@/lib/server/plan-limits-v2"
import { callAi } from "@/lib/server/ai-router-v2"

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
  slides[0] = { ...slides[0], designHint: slides[0].designHint || "title-slide", title: slides[0].title || topic }
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
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response
    if (planCheck.limits.carouselGenerationsPerMonth === 0) {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "carousel" }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid carousel input", issues: parsed.error.issues }, { status: 400 })
    }

    // Read-only quota check - decrement only after AI call succeeds
    const precheck = await checkPlanLimit(user.id, "carousels")
    if (!precheck.allowed) {
      return NextResponse.json(
        { error: "carousel_quota_exceeded", current: precheck.current, limit: precheck.limit },
        { status: 429 }
      )
    }

    const systemPrompt = `Create a LinkedIn carousel outline. Each slide has a title and 1-2 bullet points. Total slides: ${parsed.data.slideCount}. Topic: ${parsed.data.topic}. Role: ${parsed.data.role}. Return JSON: { "slides": [{ "title": string, "bullets": string[], "designHint": string }] }`
    const userMessage = parsed.data.tone ? `Tone: ${parsed.data.tone}` : "Tone: practical and sharp"

    const result = await callAi("carousel-outline",systemPrompt, userMessage, { json: true, temperature: 0.7, timeout: 20000, userId: user.id, plan: planCheck.plan })

    let slides = parseSlides(result, parsed.data.slideCount)
    if (slides.length < 5) {
      return NextResponse.json({ error: "AI returned too few slides" }, { status: 502 })
    }

    // AI succeeded - now commit the quota decrement
    const usage = await incrementUsage(user.id, "carousels")
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "carousel_quota_exceeded", current: usage.current, limit: usage.limit },
        { status: 429 }
      )
    }
    slides = enforceSlideStructure(slides, parsed.data.topic)

    const supabase = createServiceClient()
    const { data: carousel, error: saveError } = await supabase
      .from("carousels")
      .insert({
        user_id: user.id,
        topic: parsed.data.topic,
        role: parsed.data.role,
        tone: parsed.data.tone ?? null,
        slide_count: slides.length,
        slides,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      if (saveError.message?.includes("carousels") && saveError.message?.includes("schema cache")) {
        return NextResponse.json(
          { error: "Carousel storage not ready. Run the database migration to enable this feature.", slides },
          { status: 503 }
        )
      }
      throw new Error(saveError.message ?? "carousel_save_failed")
    }
    if (!carousel) throw new Error("carousel_save_failed")

    return NextResponse.json({ id: carousel.id, slides, remaining: usage.remaining, totalSlides: slides.length, availableSlides: planCheck.limits.carouselSlides })
  })(request)
}

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, topic, role, tone, slide_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      if (error.message?.includes("carousels") && error.message?.includes("schema cache")) {
        return NextResponse.json({ carousels: [], _tableNotReady: true })
      }
      throw new Error(error.message)
    }
    return NextResponse.json({ carousels: data ?? [] })
  })(request)
}
