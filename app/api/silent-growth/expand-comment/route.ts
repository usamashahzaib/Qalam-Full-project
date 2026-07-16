// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi } from "@/lib/server/ai-router-v2"
import { log } from "@/lib/server/logging"

const MIN_LENGTH = 5
const MAX_LENGTH = 1000

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

    const comment = String(body.comment || "").trim()
    if (comment.length < MIN_LENGTH) {
      return NextResponse.json({ error: `comment must be at least ${MIN_LENGTH} characters` }, { status: 400 })
    }
    if (comment.length > MAX_LENGTH) {
      return NextResponse.json({ error: `comment must be ${MAX_LENGTH} characters or fewer` }, { status: 400 })
    }

    const system = `You are a LinkedIn ghostwriter. Take a short comment idea and expand it into a full standalone LinkedIn post.
Keep the original insight and voice. Use short paragraphs and a strong opening line. No hashtags, no emoji.
Return plain text only: the finished post, nothing else (no preamble, no quotes, no labels).`

    const userMsg = `Comment idea to expand into a post:\n${comment}`

    let post = ""
    try {
      post = await callAi("chat-strategist", system, userMsg, {
        json: false,
        temperature: 0.8,
        maxTokens: 500,
        userId: user.id,
        plan: planCheck.plan,
        cache: false,
      })
    } catch (err) {
      log.warn("silent_growth.expand_comment.ai_failed", { userId: user.id, error: (err as Error).message })
    }

    if (!post.trim()) {
      return NextResponse.json(
        { error: "ai_unavailable", message: "Expansion is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }

    log.info("silent_growth.expand_comment.done", { userId: user.id })

    return NextResponse.json({ post: post.trim() })
  })(request)
}
