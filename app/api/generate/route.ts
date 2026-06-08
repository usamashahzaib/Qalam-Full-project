import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/server/auth-helpers"
import { generatePost, scoreContent, qualityControlDraft, generateHooks } from "@/lib/server/content-generator"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"
import { checkPlanLimit, getPlanStatus, decrementDraft } from "@/lib/server/plan-limits"
import { createServiceClient } from "@/lib/server/supabase-rest"

// ---------------------------------------------------------------------------
// SCHEMAS
// ---------------------------------------------------------------------------

const generateSchema = z.object({
  topic: z.string().min(3).max(200),
  role: z.enum(["ai_engineer", "ceo", "hr", "sales", "designer", "consultant", "founder", "developer"]),
  tone: z.string().optional(),
  format: z.enum(["short", "medium", "long"]).default("medium"),
  goal: z.string().max(500).optional(),
  qualityCheck: z.boolean().default(true),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  content: z.string().optional(),
  confirmOnly: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

// Derive display sections from the full post text.
function splitPost(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const hashtagLine = lines.findLast((l) => /^#\w/.test(l)) ?? ""
  const hook = lines[0] ?? ""
  const bodyLines = lines.filter((l) => l !== hook && l !== hashtagLine)
  const cta = bodyLines.at(-1) ?? ""
  const body = bodyLines.slice(0, -1).join("\n\n")
  return { hook, body, cta }
}

// ---------------------------------------------------------------------------
// GET /api/generate — usage status
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const userId = await requireAuth()
    const status = await getPlanStatus(userId)
    return NextResponse.json({
      allowed: status.remaining > 0,
      current: status.used,
      limit: status.limit,
      remaining: status.remaining,
      plan: status.plan,
    })
  } catch (error) {
    const message = (error as Error).message
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/generate — generate a post
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null)
    const parsed = generateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { topic, role, format, goal, qualityCheck } = parsed.data

    const userId = await requireAuth()
    const planStatus = await getPlanStatus(userId)
    const ip = getClientIp(request)

    const rate = await checkRateLimit(userId, planStatus.plan, ip)
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again shortly." }, { status: 429 })
    }

    const limit = await checkPlanLimit(userId, "drafts")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Draft limit reached. Upgrade your plan." }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", userId)
      .single()
    // voiceProfile is null when none exists — proceed without it

    const result = await generatePost({
      topic,
      role,
      format,
      goal,
      voiceProfile: voiceProfile ?? undefined,
    })

    let content = result.post.full_text
    let score = await scoreContent(content, role)

    if (qualityCheck && planStatus.plan.toLowerCase() !== "free") {
      const qc = await qualityControlDraft(content, role, voiceProfile ?? undefined)
      if (qc.finalScore.total_score > score.total_score) {
        content = qc.finalContent
        score = qc.finalScore
      }
    }

    const decrement = await decrementDraft(userId)
    if (!decrement.success) {
      return NextResponse.json({ error: "Failed to decrement draft" }, { status: 403 })
    }

    const { hook, body, cta } = splitPost(content)

    const { data: savedPost, error: saveError } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        content,
        role,
        format,
        score: score.total_score,
        hook,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (saveError) {
      return NextResponse.json({ error: "Failed to save post" }, { status: 500 })
    }

    const hooks = await generateHooks(topic, role, 3)

    return NextResponse.json({
      post: {
        id: savedPost?.id ?? null,
        content,
        hook,
        body,
        cta,
        hashtags: result.post.hashtags,
        role,
      },
      score,
      hooks,
      usage: { remaining: decrement.remaining },
    })
  } catch (error) {
    const message = (error as Error).message
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/generate — update or confirm a post
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const userId = await requireAuth()
    const supabase = createServiceClient()

    // Verify ownership before any read or write
    const { data: existing, error: lookupError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .single()

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (parsed.data.confirmOnly) {
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", parsed.data.id)
        .single()
      if (fetchError || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 })
      return NextResponse.json({ post })
    }

    const { data: updated, error: updateError } = await supabase
      .from("posts")
      .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 })
    }

    return NextResponse.json({ post: updated })
  } catch (error) {
    const message = (error as Error).message
    if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
