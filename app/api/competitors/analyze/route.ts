// Synchronous AI generation - cap route duration so a slow provider chain fails fast instead of
// hitting the platform kill. Requires Vercel fluid compute (default on) for values over 60s.
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { analyzeCompetitor } from "@/lib/use-cases/analyze-competitor"
import { errorToStatus } from "@/lib/errors"
import { SupabaseCompetitorRepository } from "@/lib/repositories/supabase/SupabaseCompetitorRepository"

const competitorRepo = new SupabaseCompetitorRepository()

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const monthlyLimit = planCheck.limits.researchRunsPerMonth

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const postText = String(body.postText || "").trim()
    const postUrl = String(body.postUrl || "").trim()

    if (!postText) {
      return NextResponse.json({ error: "Post text is required for analysis." }, { status: 400 })
    }

    // Atomic check+increment prevents TOCTOU race where concurrent requests
    // both pass a separate read+check and exceed the monthly quota.
    const allowed = monthlyLimit === "unlimited" || await competitorRepo.atomicIncrementIfAllowed(user.id, monthlyLimit)
    if (!allowed) {
      const runsUsed = await competitorRepo.getRunsUsed(user.id)
      return NextResponse.json(
        { error: "Monthly research limit reached. Resets next billing cycle.", runsUsed, limit: monthlyLimit },
        { status: 429 }
      )
    }

    const result = await analyzeCompetitor({ postText, userId: user.id, plan: planCheck.plan })

    if (!result.ok) {
      // Roll back the increment on AI failure so the user doesn't lose a run
      const currentRuns = await competitorRepo.getRunsUsed(user.id)
      await competitorRepo.setRunsUsed(user.id, Math.max(0, currentRuns - 1)).catch(() => undefined)
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    const analysis = result.data
    const runsUsed = await competitorRepo.getRunsUsed(user.id)

    await competitorRepo.saveAnalysis(user.id, postText, postUrl || null, analysis)

    return NextResponse.json({ analysis, runsUsed, limit: monthlyLimit })
  })(request)
}
