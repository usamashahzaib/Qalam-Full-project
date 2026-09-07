// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { getPlanLimits } from "@/lib/entitlements"
import { getCommentUsage, releaseCommentUsage, reserveCommentUsage } from "@/lib/server/comment-usage"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { generateComments } from "@/lib/use-cases/generate-comments"
import { COMMENT_STYLES, COMMENT_SOURCE_BUDGET, type CommentStyle } from "@/lib/prompts/builders/comment"
import { log } from "@/lib/server/logging"

const VALID_PROFILES = ["Founder", "Engineer", "HR", "Marketing", "Sales", "Consultant", "Tech", "Other"] as const
type Profile = (typeof VALID_PROFILES)[number]

const VALID_STYLES = COMMENT_STYLES

const VARIATIONS_PER_GENERATION = 3

// The prompt builder reads the whole post up to this budget, so the accepted
// input length and the length the model actually sees are the same number.
const MAX_POST_LENGTH = COMMENT_SOURCE_BUDGET

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const limits = getPlanLimits(planCheck.plan)

    if (limits.commentGenerationsPerMonth === "unlimited") {
      return NextResponse.json({ current: 0, remaining: "unlimited", limit: "unlimited" })
    }
    const usage = await getCommentUsage(planCheck.billingUserId, limits.commentGenerationsPerMonth)
    return NextResponse.json({ ...usage, remaining: Math.max(0, usage.limit - usage.current) })
  })(request)
}

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

    const limits = getPlanLimits(planCheck.plan)
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const postText = String(body.postText || "").trim()
    const profileInput = String(body.profile || "").trim()
    // Default to "insightful" when the caller omits a style so older clients keep working.
    const styleInput = String(body.style || "insightful").trim().toLowerCase()

    if (!postText || postText.length < 10) {
      return NextResponse.json({ error: "postText must be at least 10 characters" }, { status: 400 })
    }
    if (postText.length > MAX_POST_LENGTH) {
      return NextResponse.json({ error: `postText must be ${MAX_POST_LENGTH} characters or fewer` }, { status: 400 })
    }
    if (!(VALID_PROFILES as readonly string[]).includes(profileInput)) {
      return NextResponse.json({ error: `profile must be one of: ${VALID_PROFILES.join(", ")}` }, { status: 400 })
    }
    if (!(VALID_STYLES as readonly string[]).includes(styleInput)) {
      return NextResponse.json({ error: `style must be one of: ${VALID_STYLES.join(", ")}` }, { status: 400 })
    }
    const profile = profileInput as Profile
    const style = styleInput as CommentStyle

    // Pull the user's trained voice + resume-derived professional context so comments
    // sound like this specific person, not a generic "LinkedIn expert". Never fatal - a
    // user with no voice profile still gets comments, just without personalization.
    const voiceProfile = await getWorkspaceVoiceProfile(planCheck.workspaceId, postText.slice(0, 500)).catch(() => undefined)

    const reservation = limits.commentGenerationsPerMonth === "unlimited"
      ? null
      : await reserveCommentUsage(planCheck.billingUserId, limits.commentGenerationsPerMonth)
    if (reservation && !reservation.allowed) {
      if (reservation.unavailable) {
        return NextResponse.json(
          { error: "comment_quota_unavailable", message: "Comment quota is temporarily unavailable. Please try again in a moment." },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: "monthly_limit_reached", featureName: "comment_generations", limit: reservation.limit, current: reservation.current, remaining: 0 },
        { status: 403 }
      )
    }

    let comments: Array<{ style: string; text: string }> = []
    let modelCalls = 0
    try {
      const result = await generateComments({
        postText,
        style,
        profileLabel: profile,
        voiceProfile,
        variants: VARIATIONS_PER_GENERATION,
        userId: planCheck.billingUserId,
        plan: planCheck.plan,
      })
      comments = result.comments
      modelCalls = result.modelCalls
      if (result.remainingDefects.length) {
        log.warn("comments.generate.defects_remaining", {
          userId: user.id,
          style,
          codes: result.remainingDefects.map((d) => d.code),
        })
      }
    } catch (err) {
      log.warn("comments.generate.ai_failed", { userId: user.id, error: (err as Error).message })
    }

    if (!comments.length) {
      if (reservation) await releaseCommentUsage(planCheck.billingUserId)
      log.warn("comments.generate.empty", { userId: user.id, profile })
      return NextResponse.json(
        { error: "ai_unavailable", message: "Comment generation is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }

    // Quota is only spent on a successful generation - a failed AI call never costs the user a credit.
    let responseUsage: { current: number; limit: number | "unlimited"; remaining: number | "unlimited" } = {
      current: 0,
      limit: "unlimited",
      remaining: "unlimited",
    }
    if (limits.commentGenerationsPerMonth !== "unlimited") {
      responseUsage = { ...reservation!, remaining: Math.max(0, reservation!.limit - reservation!.current) }
    }

    log.info("comments.generate.done", { userId: user.id, profile, style, count: comments.length, modelCalls })

    return NextResponse.json({
      comments: comments.slice(0, VARIATIONS_PER_GENERATION),
      profile,
      style,
      postPreview: postText.slice(0, 200),
      usage: responseUsage,
    })
  })(request)
}
