import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getPlanLimits } from "@/lib/entitlements"
import { checkAndIncrementCommentUsage } from "@/lib/server/comment-usage"
import { log } from "@/lib/server/logging"

const VALID_PROFILES = ["Founder", "Engineer", "HR", "Marketing", "Sales", "Consultant", "Tech", "Other"] as const
type Profile = (typeof VALID_PROFILES)[number]

const MAX_POST_LENGTH = 5000

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    if (!planCheck.isActive) {
      return NextResponse.json(
        { error: "plan_expired", message: "Your plan has expired. Please renew to continue." },
        { status: 403 }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const postText = String(body.postText || "").trim()
    const profileInput = String(body.profile || "").trim()

    if (!postText || postText.length < 10) {
      return NextResponse.json({ error: "postText must be at least 10 characters" }, { status: 400 })
    }
    if (postText.length > MAX_POST_LENGTH) {
      return NextResponse.json({ error: `postText must be ${MAX_POST_LENGTH} characters or fewer` }, { status: 400 })
    }
    if (!(VALID_PROFILES as readonly string[]).includes(profileInput)) {
      return NextResponse.json({ error: `profile must be one of: ${VALID_PROFILES.join(", ")}` }, { status: 400 })
    }
    const profile = profileInput as Profile

    const system = `You are a LinkedIn expert helping a ${profile} write authentic, engaging comments on other people's posts.
Generate exactly 3 comments, one for each style:
- "insightful": adds a thoughtful perspective or observation
- "supportive": shows genuine encouragement
- "engaging": asks a follow-up question to spark discussion
Each comment must be 1 to 3 sentences, genuine, and written in a professional but human voice. Do not use hashtags or emoji.
Return JSON only, no other text: { "comments": [{ "style": "insightful" | "supportive" | "engaging", "text": "string" }] }`

    const userMsg = `Post to comment on:\n${postText.slice(0, 1200)}`

    let comments: Array<{ style: string; text: string }> = []
    try {
      const raw = await callAi("chat-strategist", system, userMsg, {
        json: true,
        temperature: 0.85,
        maxTokens: 400,
        userId: user.id,
        plan: planCheck.plan,
        cache: false,
      })
      const parsed = safeParseJson<{ comments?: Array<{ style: string; text: string }> }>(raw)
      comments = Array.isArray(parsed?.comments)
        ? parsed.comments.filter((c) => c && typeof c.text === "string" && c.text.trim().length > 0)
        : []
    } catch (err) {
      log.warn("comments.generate.ai_failed", { userId: user.id, error: (err as Error).message })
    }

    if (!comments.length) {
      log.warn("comments.generate.empty", { userId: user.id, profile })
      return NextResponse.json(
        { error: "ai_unavailable", message: "Comment generation is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }

    // Quota is only spent on a successful generation - a failed AI call never costs the user a credit.
    const limits = getPlanLimits(planCheck.plan)
    if (limits.commentGenerationsPerMonth !== "unlimited") {
      const usage = await checkAndIncrementCommentUsage(user.id, limits.commentGenerationsPerMonth)
      if (!usage.allowed) {
        return NextResponse.json(
          { error: "monthly_limit_reached", featureName: "comment_generations", limit: usage.limit, current: usage.current },
          { status: 403 }
        )
      }
    }

    log.info("comments.generate.done", { userId: user.id, profile, count: comments.length })

    return NextResponse.json({
      comments: comments.slice(0, 3),
      profile,
      postPreview: postText.slice(0, 200),
    })
  })(request)
}
