// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getPlanLimits } from "@/lib/entitlements"
import { getCommentUsage, releaseCommentUsage, reserveCommentUsage } from "@/lib/server/comment-usage"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { professionalContextPrompt } from "@/lib/professional-context"
import { log } from "@/lib/server/logging"

const VALID_PROFILES = ["Founder", "Engineer", "HR", "Marketing", "Sales", "Consultant", "Tech", "Other"] as const
type Profile = (typeof VALID_PROFILES)[number]

const VALID_STYLES = ["insightful", "supportive", "engaging"] as const
type Style = (typeof VALID_STYLES)[number]

// One comment style per generation - the user picks what they want, we return a few
// variations of that single style instead of all three styles at once.
const STYLE_GUIDES: Record<Style, string> = {
  insightful: "Add ONE sharp, specific observation or angle that builds on the post. One point, not a lecture.",
  supportive: "Genuine, warm encouragement in their own words. Specific about what landed. Not gushing.",
  engaging: "React to the post, then ask ONE natural follow-up question. Casual, not interview-style.",
}

const VARIATIONS_PER_GENERATION = 3

const MAX_POST_LENGTH = 5000

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const limits = getPlanLimits(planCheck.plan)

    if (limits.commentGenerationsPerMonth === "unlimited") {
      return NextResponse.json({ current: 0, remaining: "unlimited", limit: "unlimited" })
    }
    const usage = await getCommentUsage(user.id, limits.commentGenerationsPerMonth)
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
    const style = styleInput as Style

    // Pull the user's trained voice + resume-derived professional context so comments
    // sound like this specific person, not a generic "LinkedIn expert". Never fatal - a
    // user with no voice profile still gets comments, just without personalization.
    const voiceProfile = await getWorkspaceVoiceProfile(user.workspaceId).catch(() => undefined)
    const profContext = professionalContextPrompt(voiceProfile?.professionalContext)

    const voiceBlock = voiceProfile
      ? `WRITE IN THIS PERSON'S OWN VOICE:
Tone: ${voiceProfile.tone || "natural and direct"}
Typical sentence length: ${voiceProfile.sentenceLength || "short"}
Phrases they actually use (weave in only where it fits naturally): ${(voiceProfile.vocabulary ?? []).join(", ") || "none on file"}
Speech patterns: ${(voiceProfile.patterns ?? []).join(", ") || "none on file"}${
          voiceProfile.examples?.length
            ? `\n\nHOW THEY ACTUALLY WRITE (match the rhythm and word choice, do NOT copy the content):\n${voiceProfile.examples.slice(0, 3).map((ex) => `- ${ex.replace(/\s+/g, " ").trim().slice(0, 280)}`).join("\n")}`
            : ""
        }`
      : ""

    const system = `You help a real person write short, authentic LinkedIn comments on someone else's post. You are NOT writing a post or a paragraph - you are writing a quick human reply that sounds like this person dashed it off in ten seconds.

WHO THIS PERSON IS:
${profContext || `A ${profile}.`}

${voiceBlock}

Write exactly ${VARIATIONS_PER_GENERATION} comments, all in ONE style the person chose: "${style}".
${style} means: ${STYLE_GUIDES[style]}
Give ${VARIATIONS_PER_GENERATION} genuinely different takes on this one style - different angle, opening, and wording each time. Not minor rewrites of the same sentence.

HARD RULES (breaking these makes it read as AI):
- Each comment is 1 to 2 sentences and never more than ~35 words. Short is the entire point.
- Sound like a person typing on their phone. Contractions, plain words, a real reaction.
- React to the SPECIFIC thing in this post - reference an actual detail from it. No generic praise.
- Do not restate the post back at them. Add something of your own.
- No em dashes and no en dashes. Use a plain hyphen or split into two sentences.
- Never use these words: delve, leverage, elevate, seamless, unlock, empower, resonate, insightful, thought-provoking, holistic, game-changer.
- Never use these filler openers: "Great post", "Well said", "Couldn't agree more", "Spot on", "This resonates", "Thanks for sharing", "Love this", "As a ${profile}".
- No hashtags. No emoji.

Return JSON only, no other text: { "comments": [{ "text": "string" }] }`

    const userMsg = `Post to comment on:\n${postText.slice(0, 1200)}`

    const reservation = limits.commentGenerationsPerMonth === "unlimited"
      ? null
      : await reserveCommentUsage(user.id, limits.commentGenerationsPerMonth)
    if (reservation && !reservation.allowed) {
      return NextResponse.json(
        { error: "monthly_limit_reached", featureName: "comment_generations", limit: reservation.limit, current: reservation.current, remaining: 0 },
        { status: 403 }
      )
    }

    let comments: Array<{ style: string; text: string }> = []
    try {
      const raw = await callAi("chat-strategist", system, userMsg, {
        json: true,
        temperature: 0.8,
        maxTokens: 320,
        userId: user.id,
        plan: planCheck.plan,
        cache: false,
      })
      const parsed = safeParseJson<{ comments?: Array<{ style?: string; text: string }> }>(raw)
      comments = Array.isArray(parsed?.comments)
        ? parsed.comments
            .filter((c) => c && typeof c.text === "string" && c.text.trim().length > 0)
            .map((c) => ({ style, text: c.text }))
        : []
    } catch (err) {
      log.warn("comments.generate.ai_failed", { userId: user.id, error: (err as Error).message })
    }

    if (!comments.length) {
      if (reservation) await releaseCommentUsage(user.id)
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

    log.info("comments.generate.done", { userId: user.id, profile, style, count: comments.length })

    return NextResponse.json({
      comments: comments.slice(0, VARIATIONS_PER_GENERATION),
      profile,
      style,
      postPreview: postText.slice(0, 200),
      usage: responseUsage,
    })
  })(request)
}
