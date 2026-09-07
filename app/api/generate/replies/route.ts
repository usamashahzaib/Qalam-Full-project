// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { buildReplyPrompt } from "@/lib/prompts/builders/comment"
import { checkVariants } from "@/lib/prompts/output-checks"
import { sanitizeGeneratedText } from "@/lib/content-guard"
import { log } from "@/lib/server/logging"

const VARIANTS = 3
const MAX_REPLY_CHARS = 600

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const originalPost = String(body.originalPost || "").trim()
    const comment = String(body.comments || body.comment || "").trim()
    const role = String(body.role || "").trim() || "professional"
    const mode = body.mode === "reply" ? "reply" : "comment"
    const parentComment = String(body.parentComment || "").trim()

    if (!comment) {
      return NextResponse.json({ error: mode === "reply" ? "Reply is required" : "Comment is required" }, { status: 400 })
    }

    const voiceProfile = await getWorkspaceVoiceProfile(planCheck.workspaceId, comment).catch(() => undefined)

    const { system, user: userMsg } = buildReplyPrompt({
      target: comment,
      originalPost,
      parentComment,
      mode,
      roleLabel: role,
      voiceProfile,
      variants: VARIANTS,
    })

    let raw: string
    try {
      raw = await callAi("chat-strategist", system, userMsg, {
        json: true, temperature: 0.85, maxTokens: 600,
        userId: user.id, plan: planCheck.plan, cache: false,
      })
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message || "AI service unavailable" }, { status: 503 })
    }

    const parsed = safeParseJson<{ replies?: Array<{ style?: string; reply?: string }> }>(raw)
    const candidates = (Array.isArray(parsed?.replies) ? parsed.replies : [])
      .map((item) => ({
        style: typeof item?.style === "string" && item.style.trim() ? item.style.trim() : "Reply",
        reply: typeof item?.reply === "string" ? sanitizeGeneratedText(item.reply) : "",
      }))
      .filter((item) => item.reply.length > 0)

    // Validate what we are about to return. Three replies that say the same
    // thing in different words are one reply, so the duplicates are dropped
    // rather than shown as choices.
    const { duplicateIndexes, defects } = checkVariants(
      candidates.map((c) => c.reply),
      { expectedCount: VARIANTS, minChars: 4, maxChars: MAX_REPLY_CHARS }
    )
    const replies = candidates.filter((_, index) => !duplicateIndexes.includes(index))

    if (!replies.length) {
      return NextResponse.json({ error: "No replies generated. Try again or rephrase the comment." }, { status: 502 })
    }
    if (defects.length) {
      log.warn("generate.replies.defects_remaining", { userId: user.id, mode, codes: defects.map((d) => d.code) })
    }

    return NextResponse.json({ replies: replies.slice(0, VARIANTS) })
  })(request)
}
