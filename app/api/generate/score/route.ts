import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"

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

    const content = String(body.content || "").trim()
    const role = ROLE_MAP[String(body.role || "")] || "founder"

    if (!content || content.length < 20) {
      return NextResponse.json({ error: "Content too short to score" }, { status: 400 })
    }

    const { system, user: userMsg } = build7MetricScorePrompt(content, role)
    const raw = await callAi(system, userMsg, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId: user.id, plan: user.plan, cache: false,
    })

    const scores = safeParseJson<{
      hook: number; readability: number; authority: number; specificity: number;
      cta: number; human: number; voiceFit: number; overall: number;
      tips: Record<string, string>; hashtags: string[];
    }>(raw)

    if (!scores) {
      return NextResponse.json({ error: "Scoring returned invalid data" }, { status: 502 })
    }

    return NextResponse.json(scores)
  })(request)
}
