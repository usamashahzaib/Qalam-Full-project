import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import { requirePlan, getMonthlyCount, enforceMonthlyLimit } from "@/lib/server/require-plan"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

type CarouselProjectRow = {
  id: string
  workspace_id: string
  post_id: string | null
  theme: string | null
  created_at: string
  updated_at: string
}

type CarouselSlideDraft = {
  title?: string
  body?: string
  content?: string
  visualDirection?: string
  visual?: string
}

type CarouselScore = {
  hookSlideScore: number
  flowScore: number
  ctaSlideScore: number
  overallScore: number
  notes: string[]
}

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type JobRow = {
  id: string
  workspace_id: string
  type: string
  status: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

const themeFrom = (title = "", content = "", theme = "") => {
  if (theme.trim()) return theme.trim()
  const source = `${title} ${content}`.toLowerCase()
  if (/salary|compensation|pay|benefit/.test(source)) return "Compensation Strategy"
  if (/hire|recruit|talent|candidate/.test(source)) return "Talent Acquisition"
  if (/manager|leadership|team/.test(source)) return "Manager Effectiveness"
  if (/remote|hybrid/.test(source)) return "Remote Work"
  if (/culture|safety|toxic/.test(source)) return "People Culture"
  return title.trim().slice(0, 48) || "LinkedIn Carousel"
}

const fallbackSlides = (content: string): CarouselSlideDraft[] => {
  const clean = sanitizeGeneratedText(content)
  return [
    { title: "Stop the scroll", body: clean.slice(0, 120) || "Your carousel needs one sharp tension, not a broad topic.", visualDirection: "Bold text-only cover with high contrast" },
    { title: "The hidden issue", body: "Most drafts explain too much before they create urgency.", visualDirection: "Warning icon with simple split layout" },
    { title: "Why it fails", body: "Readers leave when slides feel like paragraphs instead of decisions.", visualDirection: "Drop-off chart or broken flow line" },
    { title: "Use this frame", body: "Hook, problem, framework, proof, then one clear action.", visualDirection: "Five-step horizontal framework" },
    { title: "Make it saveable", body: "Each slide should teach one idea someone can repeat later.", visualDirection: "Bookmark icon with checklist" },
    { title: "Save this", body: "Save this before writing your next carousel.", visualDirection: "CTA slide with save icon" },
  ]
}

const scoreText = (value: string, fallback = 70) => {
  const words = value.trim().split(/\s+/).filter(Boolean).length
  if (!words) return fallback - 20
  if (words <= 25) return 92
  if (words <= 35) return 78
  return 62
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const slideBody = (slide: CarouselSlideDraft) => sanitizeGeneratedText(slide.body || slide.content || "")

const normalizeSlides = (slides: CarouselSlideDraft[]) => slides.slice(0, 7).map((slide, index) => ({
  title: sanitizeGeneratedText(slide.title || `Slide ${index + 1}`).split(/\s+/).slice(0, 5).join(" "),
  body: slideBody(slide),
  content: slideBody(slide),
  visualDirection: sanitizeGeneratedText(slide.visualDirection || slide.visual || "Simple supporting visual"),
}))

const scoreCarousel = (slides: ReturnType<typeof normalizeSlides>): CarouselScore => {
  const first = slides[0]
  const last = slides[slides.length - 1]
  const notes: string[] = []
  const hookSignals = /stop|why|mistake|problem|truth|never|before|hidden|most|nobody|wrong/i.test(`${first?.title} ${first?.body}`) ? 18 : 0
  const ctaSignals = /save|follow|comment|dm|share|try|use|reply/i.test(`${last?.title} ${last?.body}`) ? 18 : 0
  const hookSlideScore = clampScore(scoreText(first?.body || "", 68) + hookSignals - (slides.length < 5 ? 10 : 0))
  const ctaSlideScore = clampScore(scoreText(last?.body || "", 68) + ctaSignals)
  const flowScore = clampScore(72 + Math.min(slides.length, 7) * 3 + (slides.every((slide) => slide.visualDirection) ? 8 : 0))
  const overallScore = clampScore((hookSlideScore + flowScore + ctaSlideScore) / 3)
  if (hookSlideScore < 85) notes.push("Slide 1 needs a sharper scroll-stopper.")
  if (flowScore < 85) notes.push("Story flow needs clearer problem, solution, proof progression.")
  if (ctaSlideScore < 85) notes.push("Last slide needs a clearer action.")
  return { hookSlideScore, flowScore, ctaSlideScore, overallScore, notes }
}

const parseSlides = (data: GroqResponse, content: string) => {
  try {
    const text = data.choices?.[0]?.message?.content || "[]"
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as unknown
    return Array.isArray(parsed) ? normalizeSlides(parsed as CarouselSlideDraft[]) : normalizeSlides(fallbackSlides(content))
  } catch {
    return normalizeSlides(fallbackSlides(content))
  }
}

const carouselPrompt = (topic: string) => `Create a 5-7 slide LinkedIn carousel outline on: ${topic}.
Each slide must have:
- Slide title (max 5 words)
- Slide body (max 25 words, punchy, scannable)
- Visual direction (what image/chart/icon would support this slide)

Rules:
- Slide 1: Hook only (the scroll-stopper, no context)
- Slide 2-3: Problem or insight
- Slide 4-5: Solution or framework
- Slide 6-7: Proof or result
- Last slide: CTA only (follow, comment, save, DM)

Total word count across all slides: 150-200 words max.
Each slide should be standalone-readable.`

const generateSlides = async (topic: string, theme: string, currentSlides?: ReturnType<typeof normalizeSlides>, score?: CarouselScore) => {
  const repairContext = currentSlides && score
    ? `\n\nCurrent slides scored ${score.overallScore}/100. Improve only weak areas. Weak notes: ${score.notes.join(" ")}\n\nCurrent slides:\n${JSON.stringify(currentSlides)}`
    : ""
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Return strict JSON only. Output an array of 5-7 slides with title, body, and visualDirection. Theme: ${theme}. No markdown. No em dashes.`,
        },
        { role: "user", content: `${carouselPrompt(topic)}${repairContext}` },
      ],
      temperature: currentSlides ? 0.75 : 0.55,
    }),
  })
  return parseSlides((await response.json()) as GroqResponse, topic)
}

/** GET /api/carousel - list all carousel projects in the workspace */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const rows = await supabaseSelect<CarouselProjectRow>(
      "carousel_projects",
      `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=50`
    )
    return NextResponse.json({ carousels: rows || [] })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: msg === "auth_required" ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return planCheck.response
    const { workspaceId, limits, plan } = planCheck

    const rate = await checkRateLimit(userId, plan, getClientIp(request))
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Rate limit exceeded. Please wait a moment.", ...rate },
        { status: 429 }
      )
    }

    // Monthly carousel generation limit
    if (limits.carouselGenerationsPerMonth !== "unlimited") {
      const used = await getMonthlyCount("carousel_projects", workspaceId)
      const limitErr = enforceMonthlyLimit(used, limits.carouselGenerationsPerMonth, "Carousel generation")
      if (limitErr) return limitErr
    }

    const body = await request.json()
    const { postId, content, title, theme } = body as { postId?: string | null; content?: string; title?: string; theme?: string }

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 })
    }
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 })
    }

    const topic = content.trim()
    const resolvedTheme = themeFrom(title, content, theme)
    let slidesData = await generateSlides(topic, resolvedTheme)
    if (slidesData.length < 5) slidesData = normalizeSlides(fallbackSlides(content))
    let carouselScore = scoreCarousel(slidesData)
    for (let attempt = 0; carouselScore.overallScore < 85 && attempt < 2; attempt += 1) {
      slidesData = await generateSlides(topic, resolvedTheme, slidesData, carouselScore)
      if (slidesData.length < 5) slidesData = normalizeSlides(fallbackSlides(content))
      carouselScore = scoreCarousel(slidesData)
    }
    if (carouselScore.overallScore < 85) {
      return NextResponse.json({ error: "Carousel score below quality threshold", score: carouselScore }, { status: 422 })
    }

    const projectRows = await supabaseInsert<CarouselProjectRow>(
      "carousel_projects",
      {
        workspace_id: workspaceId,
        post_id: postId || null,
        theme: resolvedTheme,
      },
      "return=representation"
    )
    const projectId = projectRows?.[0]?.id
    if (!projectId) throw new Error("carousel_project_create_failed")

    const slidesToInsert = slidesData.map((slide, index) => ({
      carousel_id: projectId,
      order_index: index,
      title: sanitizeGeneratedText(slide.title || `Slide ${index + 1}`),
      content: sanitizeGeneratedText(slide.body || slide.content || ""),
    }))

    const slides = await supabaseInsert(
      "carousel_slides",
      slidesToInsert,
      "return=representation"
    )

    await supabaseInsert<JobRow>(
      "jobs",
      {
        workspace_id: workspaceId,
        type: "carousel_generation",
        status: "completed",
        payload: { projectId, postId: postId || null, theme: resolvedTheme, score: carouselScore, slides: slidesData },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      "return=minimal"
    ).catch(() => undefined)

    return NextResponse.json({ projectId, slides: slidesData.map((slide, index) => ({ ...(slides?.[index] as object || {}), ...slide })), theme: resolvedTheme, score: carouselScore })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    if (message === "auth_required") return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
