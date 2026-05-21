import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import { requirePlan, getMonthlyCount, enforceMonthlyLimit } from "@/lib/server/require-plan"
import { getPlanLimits } from "@/lib/entitlements"

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
  content?: string
}

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const themeFrom = (title = "", content = "") => {
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
    { title: "The real problem", content: clean.slice(0, 150) || "Start with the tension your audience already feels." },
    { title: "What most teams miss", content: "The issue is rarely effort. It is usually unclear ownership, weak examples, or a rushed decision." },
    { title: "A better lens", content: "Name the tradeoff, show the consequence, then give people a concrete next step." },
    { title: "Use this test", content: "If the reader cannot repeat the point in one sentence, the slide is doing too much." },
    { title: "Takeaway", content: "Make it useful enough to save, not just polished enough to skim." },
  ]
}

/** GET /api/carousel — list all carousel projects in the workspace */
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
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response
    const { workspaceId, plan } = planCheck

    // Monthly carousel generation limit
    const limits = getPlanLimits(plan)
    if (limits.carouselGenerationsPerMonth !== "unlimited") {
      const used = await getMonthlyCount("carousel_projects", workspaceId)
      const limitErr = enforceMonthlyLimit(used, limits.carouselGenerationsPerMonth, "Carousel generation")
      if (limitErr) return limitErr
    }

    const body = await request.json()
    const { postId, content, title } = body as { postId?: string | null; content?: string; title?: string }

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 })
    }
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 })
    }

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
            content:
              "You are a premium LinkedIn carousel strategist. Convert the user's text into a 6-8 slide carousel with specific, useful slides. No generic motivational copy. No em dashes. Each slide needs a sharp title and 1-2 concise sentences. Output strict JSON array only: [{\"title\":\"...\",\"content\":\"...\"}].",
          },
          { role: "user", content: `Convert this post into carousel slides:\n\n${content}` },
        ],
        temperature: 0.4,
      }),
    })

    const data = (await response.json()) as GroqResponse
    let slidesData: CarouselSlideDraft[] = []
    try {
      const text = data.choices?.[0]?.message?.content || "[]"
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as unknown
      slidesData = Array.isArray(parsed) ? (parsed as CarouselSlideDraft[]) : []
    } catch {
      slidesData = fallbackSlides(content)
    }
    if (slidesData.length < 4) slidesData = fallbackSlides(content)

    const projectRows = await supabaseInsert<CarouselProjectRow>(
      "carousel_projects",
      {
        workspace_id: workspaceId,
        post_id: postId || null,
        theme: themeFrom(title, content),
      },
      "return=representation"
    )
    const projectId = projectRows?.[0]?.id
    if (!projectId) throw new Error("carousel_project_create_failed")

    const slidesToInsert = slidesData.map((slide, index) => ({
      carousel_id: projectId,
      order_index: index,
      title: sanitizeGeneratedText(slide.title || `Slide ${index + 1}`),
      content: sanitizeGeneratedText(slide.content || ""),
    }))

    const slides = await supabaseInsert(
      "carousel_slides",
      slidesToInsert,
      "return=representation"
    )

    return NextResponse.json({ projectId, slides })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
