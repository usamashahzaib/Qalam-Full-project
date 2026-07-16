// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { buildHookAlternativesPrompt } from "@/lib/prompts/role-aware-system"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const content = String(body.content || "").trim()
    const role = String(body.role || "").trim()

    if (!content || content.length < 20) {
      return NextResponse.json({ error: "Content too short" }, { status: 400 })
    }

    const { system, user: userMsg } = buildHookAlternativesPrompt(content, role)
    const raw = await callAi("hook-generation", system, userMsg, {
      json: true, temperature: 0.9, maxTokens: 600,
      userId: user.id, plan: planCheck.plan, cache: false,
    })

    const parsed = safeParseJson<unknown>(raw)
    const hooks: Array<{ style: string; text: string }> = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { hooks?: unknown })?.hooks)
        ? (parsed as { hooks: Array<{ style: string; text: string }> }).hooks
        : []
    if (!hooks.length) {
      return NextResponse.json({ error: "No alternatives generated" }, { status: 502 })
    }

    return NextResponse.json({ hooks: hooks.slice(0, 3) })
  })(request)
}
