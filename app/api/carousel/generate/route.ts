import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"
import { checkPlanLimit } from "@/lib/server/plan-limits"
import { callAi } from "@/lib/server/ai-router"
import { createClient } from "@supabase/supabase-js"

type Slide = {
  slide_number: number
  title: string
  content: string
  visual: string
}

const clampSlideCount = (value: unknown) => Math.min(10, Math.max(5, Math.trunc(Number(value) || 5)))

const parseSlides = (raw: string, slideCount: number) => {
  const parsed = JSON.parse(raw) as Slide[] | { slides?: Slide[] }
  const slides = Array.isArray(parsed) ? parsed : parsed.slides || []
  return slides.slice(0, slideCount).map((slide, index) => ({
    slide_number: Number(slide.slide_number || index + 1),
    title: String(slide.title || `Slide ${index + 1}`).trim().slice(0, 80),
    content: String(slide.content || "").trim().slice(0, 260),
    visual: String(slide.visual || "").trim().slice(0, 320),
  }))
}

export async function GET() {
  try {
    const userId = await requireAuth()
    return NextResponse.json(await getPlanLimitStatus(userId, "carousels"))
  } catch (error) {
    const message = (error as Error).message || "Failed to load carousel usage"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()
    const { topic, role = "founder", slideCount = 5 } = await req.json()
    const safeTopic = String(topic || "").trim()
    const safeRole = String(role || "founder").trim()
    const count = clampSlideCount(slideCount)

    if (!safeTopic) return NextResponse.json({ error: "Topic is required" }, { status: 400 })

    const { allowed, current, limit, remaining, plan } = await checkPlanLimit(userId, "carousels")
    if (!allowed) return NextResponse.json({ error: "Carousel limit reached", current, limit }, { status: 403 })

    const prompt = `Create a ${count}-slide LinkedIn carousel about "${safeTopic}" for a ${safeRole.replace("_", " ")} audience.

Each slide should have:
- A clear title (max 5 words)
- Concise content (max 30 words)
- A visual description for the designer

FORMAT:
{
  "slides": [
    {"slide_number": 1, "title": "...", "content": "...", "visual": "..."}
  ]
}

Rules:
- Slide 1 is the hook
- Slide ${count} is the CTA
- Middle slides build the argument
- No generic business jargon
- Specific, actionable content`

    const result = await callAi("Return strict JSON only.", prompt, { json: true, temperature: 0.7, timeout: 20000 })
    const slides = parseSlides(result, count)
    if (!slides.length) return NextResponse.json({ error: "AI returned no slides" }, { status: 502 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: projectId, error: projectError } = await supabase.rpc("create_carousel_project", {
      p_user_id: userId,
      p_title: safeTopic,
      p_role: safeRole,
      p_slides: slides,
    })

    if (projectError || !projectId) {
      return NextResponse.json({ error: "Failed to save carousel project" }, { status: 500 })
    }

    return NextResponse.json({ projectId, slides, usage: { allowed, current, limit, remaining, plan } })
  } catch (error) {
    const message = (error as Error).message || "Failed to generate carousel"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
