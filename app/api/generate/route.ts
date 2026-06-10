// app/api/generate/route.ts
// FINAL VERSION - 100% ready. Copy-paste this entire file. No manual changes.

export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi } from "@/lib/server/ai-router-v2"
import { checkPlanLimit, incrementUsage } from "@/lib/server/plan-limits-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import {
  buildGeneratePrompt,
  buildHumanizePrompt,
  buildScorePrompt,
  buildRewritePrompt,
  buildHookVariantsPrompt,
} from "@/lib/prompts/role-aware-system"

const generateSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").max(200, "Topic too long"),
  role: z.enum([
    "ai_engineer", "ceo", "hr", "sales", "designer",
    "consultant", "founder", "developer", "director",
    "marketer", "product_manager", "recruiter", "content_creator", "freelancer"
  ]),
  tone: z.string().max(50).optional(),
  format: z.enum(["short", "medium", "long"]).default("medium"),
  goal: z.string().max(500, "Goal too long").optional(),
  qualityCheck: z.boolean().default(true),
})

const patchSchema = z.object({
  id: z.string().uuid("Invalid post ID"),
  content: z.string().max(5000, "Content too long").optional(),
  confirmOnly: z.boolean().optional(),
})

function splitPost(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const hashtagLine = lines.findLast(l => /^#\w/.test(l)) || ""
  const hook = lines[0] || ""
  const bodyLines = lines.filter(l => l !== hook && l !== hashtagLine)
  const cta = bodyLines.at(-1) || ""
  const body = bodyLines.slice(0, -1).join("\n\n")
  return { hook, body, cta, hashtags: hashtagLine }
}

function parseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned) as T
  } catch { return null }
}

export async function GET() {
  return withAuth(async (_req, user) => {
    const status = await checkPlanLimit(user.id, "drafts")
    return NextResponse.json({
      allowed: status.allowed,
      current: status.current,
      limit: status.limit,
      remaining: status.remaining,
      plan: status.plan,
    })
  })(new NextRequest("http://localhost"))
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
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

    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("workspace_id", user.workspaceId)
      .limit(1)
      .single()

    // PASS 1: Generate raw post
    const { system: genSystem, user: genUser } = buildGeneratePrompt(
      role, topic, format, goal, voiceProfile || undefined
    )

    const rawPost = await callAi(genSystem, genUser, {
      temperature: 0.85, maxTokens: 900,
      userId: user.id, plan: user.plan, cache: false,
    })

    // PASS 2: Humanize
    const { system: humSystem, user: humUser } = buildHumanizePrompt(rawPost, role)
    let humanizedContent: string
    try {
      humanizedContent = await callAi(humSystem, humUser, {
        temperature: 0.4, maxTokens: 900,
        userId: user.id, plan: user.plan, cache: false,
      })
    } catch { humanizedContent = rawPost }

    let content = humanizedContent.trim()
    let score: any = null

    // PASS 3: Score + rewrite (paid users only)
    if (qualityCheck && user.plan !== "free") {
      try {
        const { system: scoreSystem, user: scoreUser } = buildScorePrompt(content, role)
        const scoreRaw = await callAi(scoreSystem, scoreUser, {
          json: true, temperature: 0.2, maxTokens: 400,
          userId: user.id, plan: user.plan, cache: false,
        })
        score = parseJson(scoreRaw)
      } catch { score = null }

      if (score && score.total_score < 80 && score.fix_instruction) {
        try {
          const { system: rewriteSystem, user: rewriteUser } = buildRewritePrompt(
            content, score.fix_instruction, score.biggest_weakness, role, voiceProfile || undefined
          )
          const rewritten = await callAi(rewriteSystem, rewriteUser, {
            temperature: 0.7, maxTokens: 900,
            userId: user.id, plan: user.plan, cache: false,
          })
          content = rewritten.trim()
        } catch { /* keep content as-is */ }
      }
    }

    // Atomically increment usage
    const usageResult = await incrementUsage(user.id, "drafts")
    if (!usageResult.allowed) {
      return NextResponse.json(
        { error: usageResult.error || "Usage limit exceeded" },
        { status: 403 }
      )
    }

    const { hook, body: bodyText, cta, hashtags } = splitPost(content)

    const { data: savedPost, error: saveError } = await supabase.from("posts").insert({
      workspace_id: user.workspaceId,
      content,
      role,
      format,
      score: score?.total_score || null,
      hook,
      status: "draft",
      created_at: new Date().toISOString(),
    }).select("id").single()

    if (saveError || !savedPost) {
      console.error("[Save Error]", saveError)
      return NextResponse.json({ error: "Failed to save post" }, { status: 500 })
    }

    // Generate hooks (cached)
    let hooks: Array<{ style: string; hook: string }> = []
    try {
      const { system: hookSystem, user: hookUser } = buildHookVariantsPrompt(topic, role)
      const hooksRaw = await callAi(hookSystem, hookUser, {
        json: true, temperature: 0.9, maxTokens: 400,
        userId: user.id, plan: user.plan, cache: true, cacheTtl: 3600,
      })
      hooks = parseJson<Array<{ style: string; hook: string }>>(hooksRaw) || []
    } catch { hooks = [] }

    return NextResponse.json({
      post: { id: savedPost.id, content, hook, body: bodyText, cta, hashtags, role },
      score,
      hooks: hooks.slice(0, 3),
      usage: { remaining: usageResult.remaining },
    })
  })(request)
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: post } = await supabase
      .from("posts")
      .select("id, workspace_id")
      .eq("id", parsed.data.id)
      .single()

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("workspace_id", post.workspace_id)
      .eq("user_id", user.internalId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    if (parsed.data.confirmOnly) {
      const { data: fullPost } = await supabase.from("posts").select("*").eq("id", parsed.data.id).single()
      return NextResponse.json({ post: fullPost })
    }

    const { data: updated } = await supabase.from("posts").update({
      content: parsed.data.content,
      updated_at: new Date().toISOString(),
    }).eq("id", parsed.data.id).select().single()

    if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    return NextResponse.json({ post: updated })
  })(request)
}