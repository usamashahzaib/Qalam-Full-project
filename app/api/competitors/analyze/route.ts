import { NextRequest, NextResponse } from "next/server"
import { analyzeCompetitorPaste } from "@/lib/server/competitors"
import { supabaseInsert } from "@/lib/server/supabase-rest"
import { rateLimit } from "@/lib/server/rate-limit"
import { requirePlan, getMonthlyCount, enforceMonthlyLimit } from "@/lib/server/require-plan"

type AnalyzeRequest = {
  workspaceKey?: string
  profileId?: string | null
  profileName?: string | null
  platform?: string
  sourceText?: string
}

type Job = {
  id: string
  workspace_id: string
  type: string
  status: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function POST(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return planCheck.response
    const { session, workspaceId, limits } = planCheck

    // Rate Limit: 5 analysis requests per minute per user
    if (!rateLimit(`analyze_${session.email}`, 5, 60)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 })
    }

    // Monthly research run limit
    if (limits.researchRunsPerMonth !== "unlimited") {
      const used = await getMonthlyCount("jobs", workspaceId)
      const limitErr = enforceMonthlyLimit(used, limits.researchRunsPerMonth, "Competitor research")
      if (limitErr) return limitErr
    }

    const body = (await request.json()) as AnalyzeRequest
    if (!body.sourceText?.trim()) {
      return NextResponse.json({ error: "competitor_source_missing" }, { status: 400 })
    }

    const analysis = await analyzeCompetitorPaste({
      sourceText: body.sourceText,
      profileName: body.profileName || "",
    })

    let job: Job | null = null
    try {
      const rows = await supabaseInsert<Job>("jobs", {
        workspace_id: workspaceId,
        type: "competitor_analysis",
        status: "completed",
        payload: {
          profileId: body.profileId || null,
          profileName: body.profileName || null,
          platform: body.platform || "linkedin",
          sourceText: body.sourceText,
          analysis,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, "return=representation")
      job = rows?.[0] || null
    } catch {
      // Supabase unavailable - analysis result still returned
    }

    return NextResponse.json({ analysis, job })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}
