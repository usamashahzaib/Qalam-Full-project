import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { incrementUsage, checkPlanLimit } from "@/lib/server/plan-limits-v2"
import { buildHook5StylesPrompt } from "@/lib/prompts/role-aware-system"

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

    const topic = String(body.topic || "").trim()
    const role = ROLE_MAP[String(body.role || "")] || "founder"

    if (!topic || topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    }

    const limit = await checkPlanLimit(user.id, "hooks")
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Hook limit reached. Upgrade your plan.", remaining: 0 },
        { status: 403 }
      )
    }

    const { system, user: userMsg } = buildHook5StylesPrompt(topic, role)
    const raw = await callAi(system, userMsg, {
      json: false, temperature: 0.9, maxTokens: 700,
      userId: user.id, plan: user.plan, cache: false,
    })

    const parsed = safeParseJson<unknown>(raw)
    const hooks: Array<{ style: string; text: string }> = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { hooks?: unknown })?.hooks)
        ? (parsed as { hooks: Array<{ style: string; text: string }> }).hooks
        : []
    if (!hooks.length) {
      return NextResponse.json({ error: "Hook generation returned no results" }, { status: 502 })
    }

    const usage = await incrementUsage(user.id, "hooks")

    return NextResponse.json({
      hooks: hooks.slice(0, 5),
      remaining: usage.remaining,
    })
  })(request)
}
