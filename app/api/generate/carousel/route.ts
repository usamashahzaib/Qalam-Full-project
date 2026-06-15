import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage, checkPlanLimit } from "@/lib/server/plan-limits-v2"

const ROLE_MAP: Record<string, string> = {
  HR: "HR leader",
  Marketing: "marketing professional",
  Founder: "founder",
  Consultant: "consultant",
  Sales: "sales professional",
  Tech: "developer",
  Other: "professional",
}

type Slide = {
  number: number
  title: string
  body: string
  visual_suggestion: string
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const topic = String(body.topic || "").trim()
    const role = ROLE_MAP[String(body.role || "")] || "professional"

    if (!topic || topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    }

    const limit = await checkPlanLimit(user.externalId, "carousels")
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Carousel limit reached. Upgrade to Pro for carousels.", remaining: 0, plan: limit.plan },
        { status: 403 }
      )
    }

    const system = `You are a LinkedIn carousel expert. Return only valid JSON matching the schema exactly. No markdown fences.`

    const userMsg = `Create a 5-7 slide LinkedIn carousel on "${topic}" for a ${role}.

Rules:
- Slide 1: Hook only - title max 5 words, body max 15 words, visual_suggestion: "Scroll-stopper image"
- Slides 2-3: Problem/Insight - title max 5 words, body max 25 words punchy, visual suggestion
- Slides 4-5: Solution/Framework - title max 5 words, body max 25 words, visual suggestion
- Slides 6-7 (if included): Proof/Result - title max 5 words, body max 25 words, visual suggestion
- Last slide: CTA - title: "Follow for more", body: "", visual_suggestion: "Profile photo or logo"

Return JSON:
{
  "slides": [
    {"number": 1, "title": "...", "body": "...", "visual_suggestion": "..."},
    ...
  ]
}`

    const raw = await callAi(system, userMsg, {
      json: true, temperature: 0.8, maxTokens: 1200,
      userId: user.id, plan: user.plan, cache: false,
    })

    const parsed = safeParseJson<{ slides: Slide[] }>(raw)
    if (!parsed?.slides?.length) {
      return NextResponse.json({ error: "Carousel generation returned no slides" }, { status: 502 })
    }

    const slides = parsed.slides.slice(0, 7).map((s, i) => ({
      number: s.number || i + 1,
      title: String(s.title || "").trim(),
      body: String(s.body || "").trim(),
      visual_suggestion: String(s.visual_suggestion || "").trim(),
    }))

    const usage = await incrementUsage(user.externalId, "carousels")

    return NextResponse.json({ slides, remaining: usage.remaining })
  })(request)
}
