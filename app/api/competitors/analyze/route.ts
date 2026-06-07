import { NextRequest, NextResponse } from "next/server"
import { analyzeCompetitorPaste } from "@/lib/server/competitors"
import { supabaseInsert } from "@/lib/server/supabase-rest"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"
import { requirePlan, getMonthlyCount, enforceMonthlyLimit } from "@/lib/server/require-plan"
import { requireAuth } from "@/lib/server/workspace"

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
    const userId = await requireAuth()
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return planCheck.response
    const { workspaceId, limits, plan } = planCheck

    const rate = await checkRateLimit(userId, plan, getClientIp(request))
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Rate limit exceeded. Please slow down.", ...rate },
        { status: 429 }
      )
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
    if ((message === "auth_required" || message === "Unauthorized")) return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    return NextResponse.json({ error: message }, { status: (message === "auth_required" || message === "Unauthorized") ? 401 : 500 })
  }
}
