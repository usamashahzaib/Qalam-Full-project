// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"

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

    if (!comment) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 })
    }

    const system = `You are a LinkedIn expert helping ${role}s craft authentic, engaging comment replies.
Generate exactly 3 distinct reply styles for the given comment. Keep replies concise (1-3 sentences), genuine, and professional.
Return JSON: { "replies": [{ "style": "string", "reply": "string" }] }`

    const userMsg = `${originalPost ? `Original post context:\n${originalPost.slice(0, 400)}\n\n` : ""}Comment to reply to:\n${comment}\n\nGenerate 3 reply styles: one warm/personal, one authoritative/insightful, one question-based to spark discussion.`

    let raw: string
    try {
      raw = await callAi("chat-strategist", system, userMsg, {
        json: true, temperature: 0.85, maxTokens: 400,
        userId: user.id, plan: planCheck.plan, cache: false,
      })
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message || "AI service unavailable" }, { status: 503 })
    }

    const parsed = safeParseJson<{ replies?: Array<{ style: string; reply: string }> }>(raw)
    const replies = Array.isArray(parsed?.replies) ? parsed.replies : []

    if (!replies.length) {
      return NextResponse.json({ error: "No replies generated. Try again or rephrase the comment." }, { status: 502 })
    }

    return NextResponse.json({ replies: replies.slice(0, 3) })
  })(request)
}
