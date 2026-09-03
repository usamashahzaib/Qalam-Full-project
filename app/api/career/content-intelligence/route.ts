export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { normalizeScoreBreakdown, toHundredPointScore } from "@/lib/free-tool-scores"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  content: z.string().trim().min(20).max(5000),
  sourceUrl: z.string().url().max(500).optional().or(z.literal("")),
  ownershipConfirmed: z.literal(true),
  metrics: z.object({
    impressions: z.number().int().min(0).max(100000000).default(0),
    reactions: z.number().int().min(0).max(10000000).default(0),
    comments: z.number().int().min(0).max(10000000).default(0),
    reposts: z.number().int().min(0).max(10000000).default(0),
  }),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("career_content_imports")
      .select("id, source_url, content, metrics, analysis, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ error: "Content history could not be loaded." }, { status: 500 })
    return NextResponse.json({ imports: data || [] })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Paste your own post, confirm ownership, and check the metrics." }, { status: 400 })
    const input = parsed.data
    const impressions = Math.max(1, input.metrics.impressions)
    const engagementRate = Number((((input.metrics.reactions + input.metrics.comments + input.metrics.reposts) / impressions) * 100).toFixed(2))

    const raw = await callAi(
      "voice-profile",
      "You are a LinkedIn content strategist. Return strict JSON only. Analyze the supplied content without claiming access to LinkedIn data that was not provided.",
      `Analyze this user-owned LinkedIn post and its supplied performance.

POST:
${input.content}

METRICS:
${JSON.stringify({ ...input.metrics, engagementRate })}

Every score must be an integer from 0 to 100.

Return:
{
  "content_worth_score": 0,
  "positioning": "what professional position this post creates",
  "audience_signal": "who this attracts",
  "scores": {"hook":0,"authority":0,"specificity":0,"searchability":0,"conversation":0},
  "what_worked": [""],
  "weaknesses": [""],
  "repeatable_patterns": [""],
  "next_post_angles": [""],
  "keywords": [""],
  "benchmark_note": "explain performance only from supplied metrics"
}`,
      { json: true, temperature: 0.3, timeout: 30000, userId: user.id, plan: planCheck.plan }
    )
    const analysis = safeParseJson(raw)
    if (!analysis || typeof analysis !== "object") return NextResponse.json({ error: "Content analysis failed." }, { status: 503 })
    const normalized = analysis as Record<string, unknown>
    normalized.content_worth_score = toHundredPointScore(normalized.content_worth_score)
    normalized.scores = normalizeScoreBreakdown(normalized.scores)
    normalized.engagement_rate = engagementRate
    const { data, error } = await createScopedClient(planCheck.workspaceId).from("career_content_imports").insert({
      user_id: user.id,
      source_type: "manual",
      source_url: input.sourceUrl || null,
      content: input.content,
      metrics: input.metrics,
      analysis: normalized,
      ownership_confirmed: true,
    }).select("id").single()
    if (error) return NextResponse.json({ error: "Analysis could not be saved." }, { status: 500 })
    const saved = data as unknown as { id: string }
    return NextResponse.json({ id: saved.id, analysis: normalized })
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Analysis id is required." }, { status: 400 })
    const { error } = await createScopedClient(planCheck.workspaceId).from("career_content_imports").delete().eq("id", id)
    if (error) return NextResponse.json({ error: "Analysis could not be deleted." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
