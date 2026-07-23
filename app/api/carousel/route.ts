// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { checkPlanLimit, incrementUsage, decrementUsage, requirePlan } from "@/lib/server/plan-limits-v2"
import { checkWorkspaceUsage, incrementWorkspaceUsage } from "@/lib/server/workspace-usage"
import { callAi } from "@/lib/server/ai-router-v2"
import { CAROUSEL_TONES } from "@/lib/carousel-tones"
import { pickThemeForTone } from "@/lib/carousel-design"

const schema = z.object({
  topic: z.string().min(3).max(200),
  role: z.string(),
  slideCount: z.number().min(5).max(10),
  tone: z.string().optional(),
  // Full pasted post/brief. The topic is only a short label; slides must be
  // built from this so the carousel text stays faithful to what the user wrote.
  sourceContent: z.string().max(6000).optional(),
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
    // Generous caps: these guard against runaway AI output, not normal slides.
    // Auto-fit typography in the slide components handles long text safely.
    title: String(slide?.title ?? "").slice(0, 160) || `Slide ${i + 1}`,
    bullets: Array.isArray(slide?.bullets) ? slide.bullets.map(String).slice(0, 4) : [],
    designHint: String(slide?.designHint ?? "").slice(0, 40),
  }))
}

function enforceSlideStructure(slides: Slide[], topic: string): Slide[] {
  if (slides.length === 0) return slides
  slides[0] = { ...slides[0], designHint: slides[0].designHint || "title-slide", title: slides[0].title || topic }
  const last = slides.length - 1
  // Never inject fabricated copy - the CTA slide component already renders a
  // follow prompt, so an empty bullets array is fine.
  slides[last] = {
    ...slides[last],
    designHint: slides[last].designHint || "cta-slide",
    title: slides[last].title || "Your next step",
  }
  return slides
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    if (planCheck.limits.carouselGenerationsPerMonth === 0) {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "carousel" }, { status: 403 })
    }

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "editor")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
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

    // Agency workspaces each get their own 10-carousel allowance, separate
    // from the account-wide counter above.
    const isAgency = planCheck.plan.toLowerCase() === "agency"
    if (isAgency) {
      const wsPrecheck = await checkWorkspaceUsage(workspaceId, "carousels")
      if (!wsPrecheck.allowed) {
        return NextResponse.json(
          { error: "workspace_carousel_quota_exceeded", current: wsPrecheck.used, limit: wsPrecheck.limit },
          { status: 429 }
        )
      }
    }

    const sourceContent = parsed.data.sourceContent?.trim()
    const toneMeta = parsed.data.tone ? CAROUSEL_TONES[parsed.data.tone] : undefined
    const structureBlock = toneMeta
      ? `Follow this slide-by-slide narrative arc (adapt to ${parsed.data.slideCount} slides, first slide is the hook, last slide is the CTA):\n${toneMeta.structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : "First slide is the hook, last slide is the CTA."

    const systemPrompt = `You write LinkedIn carousel outlines. Total slides: exactly ${parsed.data.slideCount}. Author role: ${parsed.data.role}.

${structureBlock}

Rules:
- Slide title: max 8 words, punchy.
- 1-2 bullets per slide, max 20 words each.
- designHint: one of "title-slide", "big-stat", "list", "quote", "paragraph", "cta-slide" describing the best layout for that slide.
${sourceContent ? `- The user supplied source content. Stay 100% faithful to it: reuse the author's own phrases, facts, and numbers. Condense, do not rewrite. Never invent claims, statistics, or examples that are not in the source.` : `- Keep claims general and honest. Never fabricate statistics.`}

Return only JSON: { "slides": [{ "title": string, "bullets": string[], "designHint": string }] }`

    const userMessage = [
      `Topic: ${parsed.data.topic}`,
      parsed.data.tone ? `Tone: ${parsed.data.tone}` : "Tone: practical and sharp",
      sourceContent ? `Source content:\n\n${sourceContent}` : "",
    ].filter(Boolean).join("\n\n")

    // cache: false - regenerating the same topic must produce a fresh deck,
    // not yesterday's cached slides.
    const result = await callAi("carousel-outline", systemPrompt, userMessage, { json: true, temperature: 0.7, timeout: 30000, maxTokens: 3000, userId: user.id, plan: planCheck.plan, cache: false })

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
    if (isAgency) {
      const wsUsage = await incrementWorkspaceUsage(workspaceId, "carousels")
      if (!wsUsage.allowed) {
        await decrementUsage(user.id, "carousels")
        return NextResponse.json(
          { error: "workspace_carousel_quota_exceeded", current: wsUsage.used, limit: wsUsage.limit },
          { status: 429 }
        )
      }
    }
    slides = enforceSlideStructure(slides, parsed.data.topic)

    // Rotate the visual theme per generation so decks with the same tone
    // still come out looking different from each other.
    const themeId = pickThemeForTone(parsed.data.tone)

    const supabase = createServiceClient()
    const baseRow = {
      user_id: user.id,
      workspace_id: workspaceId,
      topic: parsed.data.topic,
      role: parsed.data.role,
      tone: parsed.data.tone ?? null,
      slide_count: slides.length,
      slides,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    let { data: carousel, error: saveError } = await supabase
      .from("carousels")
      .insert({ ...baseRow, theme_id: themeId })
      .select()
      .single()

    // theme_id column may not exist yet (migration 0050 not applied) - retry
    // without it rather than failing the whole generation.
    if (saveError && saveError.message?.includes("theme_id")) {
      ;({ data: carousel, error: saveError } = await supabase
        .from("carousels")
        .insert(baseRow)
        .select()
        .single())
    }

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
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "viewer")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, topic, role, tone, slide_count, created_at")
      .eq("workspace_id", workspaceId)
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
