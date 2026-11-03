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
import { LINKEDIN_POSITIONING_RULES } from "@/lib/prompts/role-aware-system"
import { CAROUSEL_SYSTEM_PROMPT } from "@/lib/prompts/builders/carousel"
import { authorizeRole } from "@/lib/server/roles"
import { incrementWorkspaceUsage, decrementWorkspaceUsage } from "@/lib/server/workspace-usage"
import { authorFacts, authorStory, sourceMaterial } from "@/lib/prompts/writing-policy"
import { checkGrounding, repairBrief, type Defect } from "@/lib/prompts/output-checks"
import { cleanStory } from "@/lib/interview"
import { checkSlides, MAX_COVER_WORDS, MAX_SLIDE_WORDS } from "@/lib/carousel-deck"

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
    const goal = String(body.goal || "").trim().slice(0, 500)
    const story = cleanStory(body.story)
    // A finished post to turn into slides. Its facts are the only ones the slides may use.
    const sourcePost = typeof body.sourcePost === "string" ? body.sourcePost.trim().slice(0, 3000) : ""

    if (!topic || topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    }

    const usage = await incrementUsage(planCheck.billingUserId, "carousels")
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "carousel_quota_exceeded", remaining: 0 },
        { status: 429 }
      )
    }
    const isAgency = planCheck.plan.toLowerCase() === "agency"
    if (isAgency) {
      const workspaceUsage = await incrementWorkspaceUsage(planCheck.workspaceId, "carousels")
      if (!workspaceUsage.allowed) {
        await decrementUsage(planCheck.billingUserId, "carousels")
        return NextResponse.json({ error: "workspace_carousel_quota_exceeded", remaining: 0 }, { status: 429 })
      }
    }

    const voiceProfile = await getWorkspaceVoiceProfile(planCheck.workspaceId, undefined, planCheck.plan).catch(() => undefined)
    const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext)
    const system = `${CAROUSEL_SYSTEM_PROMPT}

${professionalContext}

${LINKEDIN_POSITIONING_RULES}

${authorStory(story)}`

    const userMsg = `Create a 5-7 slide LinkedIn carousel on "${topic}" for a ${role}.
${goal ? `Content intent and outcome: ${goal}` : ""}
${sourcePost ? `\nTurn this post into the carousel. Keep its argument and its order. Use only the facts and numbers it contains, and keep the author's own wording where it is strong. Do not add a statistic, example or story it does not have.\n${sourceMaterial("The post", sourcePost)}\n` : ""}

Rules:
- Slide 1: Hook only - title max 5 words, body max 15 words, visual_suggestion: "Scroll-stopper image"
- Slides 2-3: Problem/Insight - title max 5 words, body max 25 words punchy, visual suggestion
- Slides 4-5: Solution/Framework - title max 5 words, body max 25 words, visual suggestion
- Slides 6-7 (if included): Proof/Result - title max 5 words, body max 25 words, visual suggestion. Use only supplied proof
- Last slide: Earned close or useful next step. No "Follow for more", keyword comments, or tag requests

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
      await decrementUsage(planCheck.billingUserId, "carousels")
      if (isAgency) await decrementWorkspaceUsage(planCheck.workspaceId, "carousels")
      log.error("generate-carousel.generation_failed", { userId: user.id, error: (genError as Error).message })
      return NextResponse.json({ error: "Carousel generation is temporarily unavailable. Please try again in a moment." }, { status: 503 })
    }

    const parsed = safeParseJson<{ slides: Slide[] }>(raw)
    if (!parsed?.slides?.length) {
      await decrementUsage(planCheck.billingUserId, "carousels")
      if (isAgency) await decrementWorkspaceUsage(planCheck.workspaceId, "carousels")
      return NextResponse.json({ error: "Carousel generation returned no slides" }, { status: 502 })
    }

    const normalize = (items: Slide[]) => items.slice(0, 7).map((s, i) => ({
      number: i + 1,
      title: String(s.title || "").trim(),
      body: String(s.body || "").trim(),
      visual_suggestion: String(s.visual_suggestion || "").trim(),
    }))
    let slides = normalize(parsed.slides)

    // Layout rules plus the same grounding check posts get: a figure or a cited study the author
    // never gave is removed. One repair pass, kept only if it leaves fewer problems.
    const sources = [topic, goal, story, sourcePost, authorFacts(voiceProfile)].filter(Boolean).join("\n")
    const brief = [topic, goal, story, sourcePost].filter(Boolean).join("\n")
    const findProblems = (items: typeof slides) => {
      const text = items.map((s) => [s.title, s.body].filter(Boolean).join(". ")).join("\n")
      const grounding: Defect[] = checkGrounding(text, sources, { brief })
      return { layout: checkSlides(items), grounding }
    }
    let problems = findProblems(slides)
    if (problems.layout.length || problems.grounding.length) {
      try {
        const fixes = [
          ...problems.layout.map((issue) => `- ${issue.message}`),
          ...(problems.grounding.length ? [repairBrief(problems.grounding)] : []),
        ].join("\n")
        const repairMsg = `Fix only these problems in the carousel below and return the full corrected carousel in the same JSON shape. Cover title ${MAX_COVER_WORDS} words or fewer. Every other slide ${MAX_SLIDE_WORDS} words or fewer in total. Keep slide order, facts and wording that already work.\n\nPROBLEMS:\n${fixes}\n\nCAROUSEL:\n${JSON.stringify({ slides })}`
        const repairedRaw = await callAi("post-improvement", system, repairMsg, {
          json: true, temperature: 0.3, maxTokens: 1400,
          userId: user.id, plan: planCheck.plan, cache: false,
        })
        const repaired = safeParseJson<{ slides: Slide[] }>(repairedRaw)
        if (repaired?.slides?.length) {
          const candidate = normalize(repaired.slides)
          const candidateProblems = findProblems(candidate)
          if (candidateProblems.layout.length + candidateProblems.grounding.length < problems.layout.length + problems.grounding.length) {
            slides = candidate
            problems = candidateProblems
          }
        }
      } catch {
        // Keep the first version. The editor shows what is left.
      }
    }
    const issues = [
      ...problems.layout,
      ...problems.grounding.map((defect) => ({ slide: 0, code: defect.code, message: defect.detail })),
    ]

    return NextResponse.json({ slides, issues, remaining: usage.remaining, totalSlides: slides.length, availableSlides: planCheck.limits.carouselSlides })
  })(request)
}
