import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"
import { checkAndIncrementLimit } from "@/lib/server/plan-limits"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"
import { buildRoleAwareSystemPrompt } from "@/lib/prompts/role-aware-system"
import { analyzeContentWithAi, type ContentScore, type ContentAnalysis } from "@/lib/content-intelligence"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { ensureWorkspaceForUser, fetchWorkspacePlan, getClerkAuthContext } from "@/lib/server/workspace"
import { sanitizeGeneratedText } from "@/lib/content-guard"

type GenerateBody = {
  mode?: "draft" | "intelligence" | "hooks" | "comment-replies" | "repair"
  topic?: string
  prompt?: string
  title?: string
  role?: string
  format?: string
  hook?: string
  workspaceId?: string
  workspaceKey?: string
  postType?: string
  content?: string
  previousDraft?: string
  variation?: boolean
  originalPost?: string
  comments?: string
  profile?: {
    name?: string
    title?: string
    industry?: string
    tone?: string
    goals?: string[]
  }
}

const toContentAnalysis = (score: ContentScore, content: string): ContentAnalysis => ({
  overallScore: score.overall,
  overallLabel: score.overall >= 82 ? "Strong" : score.overall >= 68 ? "Solid" : score.overall >= 52 ? "Needs polish" : "Weak",
  hookType: "AI-scored",
  scores: [
    { label: "Hook", score: score.hook, note: score.feedback[0] || "" },
    { label: "Specificity", score: score.specificity, note: score.feedback[1] || "" },
    { label: "CTA", score: score.cta, note: score.feedback[2] || "" },
    { label: "Human-likeness", score: score.humanLikeness, note: "" },
    { label: "Voice fit", score: score.voiceFit, note: "" },
  ],
  improvements: score.feedback,
  hashtags: [],
  excerpt: content.slice(0, 180),
})

async function generateFullPost({
  topic,
  role,
  hook,
  format,
  voiceProfile,
  variation,
  previousDraft,
}: {
  topic: string
  role: string
  hook?: string
  format?: string
  voiceProfile?: { sample_posts?: string[] } | null
  variation?: boolean
  previousDraft?: string
}) {
  const systemPrompt = buildRoleAwareSystemPrompt(role, voiceProfile ?? undefined)

  let userPrompt = hook
    ? `Write a LinkedIn post using this hook: "${hook}"\n\nTopic: ${topic}`
    : `Write a LinkedIn post about: ${topic}`

  if (variation && previousDraft) {
    userPrompt += `\n\nRegenerate as a different variation. Do not repeat this previous draft:\n${previousDraft}`
  }

  const content = sanitizeGeneratedText(await callAi(systemPrompt, userPrompt, { temperature: 0.8, timeout: 20000 }))

  let qualityScore = await analyzeContentWithAi(content, role, voiceProfile ?? undefined)
  let finalContent = content
  let finalScore = qualityScore

  if (qualityScore.overall < 75) {
    const rewritePrompt = `The previous post scored ${qualityScore.overall}/100. Issues: ${qualityScore.feedback.join(", ")}.\n\nRewrite this post to fix these issues. Make it more specific, more human, and more engaging.\n\nOriginal: ${content}`
    finalContent = sanitizeGeneratedText(await callAi(systemPrompt, rewritePrompt, { temperature: 0.9, timeout: 20000 }))
    finalScore = await analyzeContentWithAi(finalContent, role, voiceProfile ?? undefined)
  }

  return { finalContent, finalScore }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 })

    const ctx = await getClerkAuthContext()
    const body = (await request.json()) as GenerateBody
    const mode = body.mode || "draft"

    const ip = getClientIp(request as Parameters<typeof getClientIp>[0])
    const topic = String(body.topic || body.prompt || body.title || "").trim()
    const role = body.role || "ceo-founder"
    const format = body.format || body.postType || "text"
    const hook = body.hook?.trim()

    const supabase = createServiceClient()
    const { data: membership } = await supabase
      .from("memberships")
      .select("workspace_id")
      .eq("user_id", ctx.supabaseUserId)
      .limit(1)
      .maybeSingle()

    let wsId = body.workspaceId || body.workspaceKey || membership?.workspace_id
    if (!wsId) {
      wsId = await ensureWorkspaceForUser({ userId: ctx.supabaseUserId, firstName: ctx.firstName })
    }

    const { plan } = await fetchWorkspacePlan(wsId, ctx.email)

    const rateCheck = await checkRateLimit(userId, plan, ip)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "rate_limit",
          message: "Too many requests. Please wait a moment.",
          reset: rateCheck.reset,
        },
        { status: 429 }
      )
    }

    if (mode === "hooks") {
      const content = String(body.content || topic).trim()
      if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 })

      const hooksJson = await callAi(
        `Generate exactly 5 LinkedIn hook openers as a JSON object: {"hooks":["hook1","hook2","hook3","hook4","hook5"]}. Each hook must be under 20 words, specific, and scroll-stopping. No banned AI words.`,
        `Topic or draft:\n${content}`,
        { json: true, temperature: 0.8, timeout: 15000 }
      )
      let hooks: string[] = []
      try {
        const parsed = JSON.parse(hooksJson) as { hooks?: string[] }
        hooks = (parsed.hooks || []).map((h) => sanitizeGeneratedText(String(h))).filter(Boolean).slice(0, 5)
      } catch {
        hooks = []
      }
      return NextResponse.json({ hooks, usageCost: 1 })
    }

    if (mode === "comment-replies") {
      const comments = String(body.comments || "").trim()
      if (!comments) return NextResponse.json({ error: "Comments are required." }, { status: 400 })

      const repliesJson = await callAi(
        `Generate thoughtful LinkedIn comment replies as JSON: {"replies":[{"comment":"...","style":"helpful","reply":"..."}]}. Keep replies human, specific, and under 280 characters.`,
        `Original post:\n${body.originalPost || body.content || ""}\n\nComments:\n${comments}`,
        { json: true, temperature: 0.7, timeout: 15000 }
      )
      let replies: Array<{ comment: string; style: string; reply: string }> = []
      try {
        const parsed = JSON.parse(repliesJson) as { replies?: Array<{ comment: string; style: string; reply: string }> }
        replies = (parsed.replies || []).filter((r) => r?.comment && r?.reply).slice(0, 18)
      } catch {
        replies = []
      }
      return NextResponse.json({ replies })
    }

    if (mode === "repair") {
      const content = String(body.content || "").trim()
      if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 })

      const systemPrompt = buildRoleAwareSystemPrompt(role)
      const repairPrompt = `${body.prompt || "Improve this draft toward 90+ quality."}\n\nDraft:\n${content}`
      const repaired = sanitizeGeneratedText(await callAi(systemPrompt, repairPrompt, { temperature: 0.7, timeout: 20000 }))
      const score = await analyzeContentWithAi(repaired, role)
      const analysis = toContentAnalysis(score, repaired)
      return NextResponse.json({ text: repaired, analysis, metTarget: score.overall >= 90, usageCost: 1 })
    }

    if (mode === "intelligence") {
      const content = String(body.content || "").trim()
      if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 })
      const score = await analyzeContentWithAi(content, role)
      return NextResponse.json({ analysis: toContentAnalysis(score, content) })
    }

    if (!topic) return NextResponse.json({ error: "Prompt is required." }, { status: 400 })

    const limitCheck = await checkAndIncrementLimit(wsId, "drafts", plan)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "plan_limit",
          message: `You have reached your ${limitCheck.limit} draft limit for this month. Upgrade to continue.`,
        },
        { status: 403 }
      )
    }

    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("workspace_id", wsId)
      .maybeSingle()

    const { finalContent, finalScore } = await generateFullPost({
      topic,
      role,
      hook,
      format,
      voiceProfile,
      variation: body.variation,
      previousDraft: body.previousDraft,
    })

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        workspace_id: wsId,
        author_id: ctx.supabaseUserId,
        title: topic.slice(0, 200),
        content: finalContent,
        type: format,
        status: "draft",
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("generate_post_insert_failed", insertError)
      return NextResponse.json({ error: "failed_to_save_post" }, { status: 500 })
    }

    const analysis = toContentAnalysis(finalScore, finalContent)

    return NextResponse.json({
      text: finalContent,
      post: finalContent,
      postId: post?.id,
      qualityScore: finalScore,
      analysis,
      metTarget: finalScore.overall >= 75,
      needsPolish: finalScore.overall < 90,
      remainingDrafts: limitCheck.remaining,
      usageCost: 1,
    })
  } catch (error) {
    console.error("Generate error:", error)
    const message = (error as Error).message || "Internal server error"
    if (message === "auth_required") {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
