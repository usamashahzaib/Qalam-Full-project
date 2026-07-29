// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { requirePlan } from "@/lib/server/require-plan"
import { log } from "@/lib/server/logging"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { professionalContextPrompt } from "@/lib/professional-context"
import { authorizeRole } from "@/lib/server/roles"

type Slide = {
  number: number
  title: string
  body: string
  visual_suggestion: string
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    if (planCheck.limits.carouselGenerationsPerMonth === 0) {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "carousel" }, { status: 403 })
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const topic = String(body.topic || "").trim()
    const role = String(body.role || "").trim() || "professional"

    if (!topic || topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    }

    const usage = await incrementUsage(user.id, "carousels")
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "carousel_quota_exceeded", remaining: 0 },
        { status: 429 }
      )
    }

    const voiceProfile = await getWorkspaceVoiceProfile(user.workspaceId).catch(() => undefined)
    const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext)
    const system = `You are a LinkedIn carousel expert. Return only valid JSON matching the schema exactly. No markdown fences.

${professionalContext}`

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

    let raw: string
    try {
      raw = await callAi("carousel-outline", system, userMsg, {
        json: true, temperature: 0.8, maxTokens: 1200,
        userId: user.id, plan: planCheck.plan, cache: false,
      })
    } catch (genError) {
      await decrementUsage(user.id, "carousels")
      log.error("generate-carousel.generation_failed", { userId: user.id, error: (genError as Error).message })
      return NextResponse.json({ error: "Carousel generation is temporarily unavailable. Please try again in a moment." }, { status: 503 })
    }

    const parsed = safeParseJson<{ slides: Slide[] }>(raw)
    if (!parsed?.slides?.length) {
      await decrementUsage(user.id, "carousels")
      return NextResponse.json({ error: "Carousel generation returned no slides" }, { status: 502 })
    }

    const slides = parsed.slides.slice(0, 7).map((s, i) => ({
      number: s.number || i + 1,
      title: String(s.title || "").trim(),
      body: String(s.body || "").trim(),
      visual_suggestion: String(s.visual_suggestion || "").trim(),
    }))

    return NextResponse.json({ slides, remaining: usage.remaining, totalSlides: slides.length, availableSlides: planCheck.limits.carouselSlides })
  })(request)
}
