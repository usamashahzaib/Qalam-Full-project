// Synchronous AI generation. Cap route duration so a slow provider chain fails fast.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { buildCtaAlternativesPrompt } from "@/lib/prompts/role-aware-system"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { professionalContextPrompt } from "@/lib/professional-context"
import { authorizeRole } from "@/lib/server/roles"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const content = String(body.content || "").trim()
    const role = String(body.role || "").trim()
    if (content.length < 20) {
      return NextResponse.json({ error: "Content too short" }, { status: 400 })
    }

    const { system, user: userMessage } = buildCtaAlternativesPrompt(content, role)
    const voiceProfile = await getWorkspaceVoiceProfile(user.workspaceId).catch(() => undefined)
    const context = professionalContextPrompt(voiceProfile?.professionalContext)
    const contextualSystem = context ? `${system}\n\n${context}` : system
    const raw = await callAi("cta-rewrite", contextualSystem, userMessage, {
      json: true,
      temperature: 0.9,
      maxTokens: 400,
      userId: user.id,
      plan: planCheck.plan,
      cache: false,
    })

    const parsed = safeParseJson<unknown>(raw)
    const alternatives: string[] = Array.isArray(parsed)
      ? parsed.map(String)
      : Array.isArray((parsed as { alternatives?: unknown })?.alternatives)
        ? (parsed as { alternatives: unknown[] }).alternatives.map(String)
        : []

    if (!alternatives.length) {
      return NextResponse.json({ error: "No alternatives generated" }, { status: 502 })
    }

    return NextResponse.json({ alternatives: alternatives.slice(0, 3) })
  })(request)
}
