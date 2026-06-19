import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"

const ROLE_MAP: Record<string, string> = {
  HR: "hr",
  Marketing: "marketer",
  Founder: "founder",
  Consultant: "consultant",
  Sales: "sales",
  Tech: "developer",
  Other: "ceo",
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const originalPost = String(body.originalPost || "").trim()
    const comment = String(body.comments || body.comment || "").trim()
    const role = ROLE_MAP[String(body.role || "")] || "founder"

    if (!comment) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 })
    }

    const system = `You are a LinkedIn expert helping ${role}s craft authentic, engaging comment replies.
Generate exactly 3 distinct reply styles for the given comment. Keep replies concise (1-3 sentences), genuine, and professional.
Return JSON: { "replies": [{ "style": "string", "reply": "string" }] }`

    const userMsg = `${originalPost ? `Original post context:\n${originalPost.slice(0, 400)}\n\n` : ""}Comment to reply to:\n${comment}\n\nGenerate 3 reply styles: one warm/personal, one authoritative/insightful, one question-based to spark discussion.`

    const raw = await callAi("chat-strategist",system, userMsg, {
      json: true, temperature: 0.85, maxTokens: 400,
      userId: user.id, plan: user.plan, cache: false,
    })

    const parsed = safeParseJson<{ replies?: Array<{ style: string; reply: string }> }>(raw)
    const replies = Array.isArray(parsed?.replies) ? parsed.replies : []

    if (!replies.length) {
      return NextResponse.json({ error: "No replies generated" }, { status: 502 })
    }

    return NextResponse.json({ replies: replies.slice(0, 3) })
  })(request)
}
