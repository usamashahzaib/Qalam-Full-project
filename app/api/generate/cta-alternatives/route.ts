import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { buildCtaAlternativesPrompt } from "@/lib/prompts/role-aware-system"

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
      return NextResponse.json({ error: "Content too short" }, { status: 400 })
    }

    const { system, user: userMsg } = buildCtaAlternativesPrompt(content, role)
    const raw = await callAi("post-improvement",system, userMsg, {
      json: true, temperature: 0.9, maxTokens: 400,
      userId: user.id, plan: user.plan, cache: false,
    })

    const parsed = safeParseJson<unknown>(raw)
    const alternatives: string[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { alternatives?: unknown })?.alternatives)
        ? (parsed as { alternatives: string[] }).alternatives
        : []
    if (!alternatives.length) {
      return NextResponse.json({ error: "No alternatives generated" }, { status: 502 })
    }

    return NextResponse.json({ alternatives: alternatives.slice(0, 3) })
  })(request)
}
