import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage, checkPlanLimit } from "@/lib/server/plan-limits-v2"
import { buildPushTo90Prompt, build7MetricScorePrompt } from "@/lib/prompts/role-aware-system"

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
    const scores = (body.scores || {}) as Record<string, number>

    if (!content || content.length < 20) {
      return NextResponse.json({ error: "Content too short to improve" }, { status: 400 })
    }

    const limit = await checkPlanLimit(user.id, "drafts")
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Draft limit reached. Upgrade your plan.", remaining: 0 },
        { status: 403 }
      )
    }

    // Rewrite weak sections
    const { system: impSystem, user: impUser } = buildPushTo90Prompt(content, scores, role)
    const improved = await callAi(impSystem, impUser, {
      temperature: 0.7, maxTokens: 1000,
      userId: user.id, plan: user.plan, cache: false,
    })

    const improvedContent = improved.trim()

    // Re-score the improved version
    const { system: scoreSystem, user: scoreUser } = build7MetricScorePrompt(improvedContent, role)
    const scoreRaw = await callAi(scoreSystem, scoreUser, {
      json: true, temperature: 0.2, maxTokens: 600,
      userId: user.id, plan: user.plan, cache: false,
    })

    const newScores = safeParseJson<Record<string, unknown>>(scoreRaw) || {}

    const usage = await incrementUsage(user.id, "drafts")

    return NextResponse.json({
      content: improvedContent,
      scores: newScores,
      remaining: usage.remaining,
    })
  })(request)
}
