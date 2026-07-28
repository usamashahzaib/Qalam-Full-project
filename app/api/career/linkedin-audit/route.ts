export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/plan-limits-v2"
import { authorizeRole } from "@/lib/server/roles"
import { consumeCareerUsage } from "@/lib/server/career-usage"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  headline: z.string().trim().min(10).max(300),
  about: z.string().trim().min(40).max(4000),
  targetRole: z.string().trim().min(2).max(120),
  audience: z.string().trim().max(300).default("Recruiters and decision-makers"),
})

const score = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Add your headline, About section, and target role." }, { status: 400 })

    const usage = await consumeCareerUsage(user.id, planCheck.plan, "linkedin_audit")
    if (!usage.allowed) return NextResponse.json({ error: "Your LinkedIn audit limit is reached for this month." }, { status: 429 })

    const input = parsed.data
    const raw = await callAi(
      "voice-profile",
      "You are a senior LinkedIn positioning strategist. Return strict JSON only. Preserve truth. Never invent credentials or results.",
      `Audit this LinkedIn profile for recruiter discovery, credibility, and conversion.

TARGET ROLE: ${input.targetRole}
TARGET AUDIENCE: ${input.audience}
HEADLINE: ${input.headline}
ABOUT: ${input.about}

Return:
{
  "overall_score": 0,
  "scores": {
    "positioning": 0,
    "searchability": 0,
    "credibility": 0,
    "clarity": 0,
    "conversion": 0
  },
  "market_position": "one sentence",
  "diagnosis": "specific diagnosis",
  "headline": "rewritten headline under 220 characters",
  "about": "rewritten About section",
  "top_fixes": ["five prioritized fixes"],
  "keywords": ["ten relevant keywords"],
  "thirty_day_plan": ["four weekly actions"]
}`,
      { json: true, temperature: 0.3, timeout: 30000, userId: user.id, plan: planCheck.plan }
    )

    const parsedAi = safeParseJson(raw)
    if (!parsedAi || typeof parsedAi !== "object") return NextResponse.json({ error: "The audit could not be completed." }, { status: 503 })
    const result = parsedAi as Record<string, unknown>
    result.overall_score = score(result.overall_score)
    if (result.scores && typeof result.scores === "object") {
      result.scores = Object.fromEntries(Object.entries(result.scores).map(([key, value]) => [key, score(value)]))
    }

    const { error } = await createServiceClient().from("linkedin_audits").insert({
      workspace_id: planCheck.workspaceId,
      user_id: user.id,
      input,
      result,
      overall_score: result.overall_score,
    })
    if (error) console.error("linkedin_audit_save_failed", error)

    return NextResponse.json(result)
  })(request)
}
