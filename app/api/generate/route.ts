import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { generatePost, scoreContent, qualityControlDraft, generateHooks } from "@/lib/server/content-generator"
import { checkPlanLimit, getPlanStatus, decrementDraft } from "@/lib/server/plan-limits-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"

const generateSchema = z.object({
  topic: z.string().min(3).max(200),
  role: z.enum([
    "ai_engineer", "ceo", "hr", "sales", "designer", "consultant",
    "founder", "developer", "director", "marketer", "product_manager",
    "recruiter", "content_creator", "freelancer",
  ]),
  tone: z.string().max(50).optional(),
  format: z.enum(["short", "medium", "long"]).default("medium"),
  goal: z.string().max(500).optional(),
  qualityCheck: z.boolean().default(true),
})

const patchSchema = z.object({
  id: z.string().uuid(),
  content: z.string().max(5000).optional(),
  confirmOnly: z.boolean().optional(),
})

function splitPost(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const hashtagLine = lines.findLast((l) => /^#\w/.test(l)) ?? ""
  const hook = lines[0] ?? ""
  const bodyLines = lines.filter((l) => l !== hook && l !== hashtagLine)
  const cta = bodyLines.at(-1) ?? ""
  const body = bodyLines.slice(0, -1).join("\n\n")
  return { hook, body, cta, hashtags: hashtagLine }
}

export async function GET() {
  return withAuth(async (_req, user) => {
    const status = await getPlanStatus(user.id)
    return NextResponse.json({
      allowed: status.remaining > 0,
      current: status.used,
      limit: status.limit,
      remaining: status.remaining,
      plan: status.plan,
    })
  })(new NextRequest("http://localhost"))
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { topic, role, format, goal, qualityCheck } = parsed.data

    const limit = await checkPlanLimit(user.id, "drafts")
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Draft limit reached. Upgrade your plan.", remaining: 0 },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()
    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const result = await generatePost({
      topic,
      role,
      format,
      goal,
      voiceProfile: voiceProfile ?? undefined,
    })

    let content = result.post.full_text
    let score = await scoreContent(content, role)

    if (qualityCheck && user.plan !== "free") {
      const qc = await qualityControlDraft(content, role, voiceProfile ?? undefined)
      if (qc.finalScore.total_score > score.total_score) {
        content = qc.finalContent
        score = qc.finalScore
      }
    }

    const decrement = await decrementDraft(user.id)
    if (!decrement.success) {
      return NextResponse.json(
        { error: "Failed to record usage. Please try again." },
        { status: 500 }
      )
    }

    const { hook, body: bodyText, cta, hashtags } = splitPost(content)

    const { data: savedPost, error: saveError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content,
        role,
        format,
        score: score.total_score,
        hook,
        status: "draft",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (saveError || !savedPost) {
      console.error("[Save Error]", saveError)
      return NextResponse.json(
        { error: "Failed to save post. Please try again." },
        { status: 500 }
      )
    }

    const hooks = await generateHooks(topic, role, 3)

    return NextResponse.json({
      post: {
        id: savedPost.id,
        content,
        hook,
        body: bodyText,
        cta,
        hashtags: hashtags || result.post.hashtags,
        role,
      },
      score,
      hooks,
      usage: { remaining: decrement.remaining },
    })
  })(request)
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (parsed.data.confirmOnly) {
      const { data: post, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", parsed.data.id)
        .single()
      if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 })
      return NextResponse.json({ post })
    }

    const { data: updated, error } = await supabase
      .from("posts")
      .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 })
    }

    return NextResponse.json({ post: updated })
  })(request)
}
