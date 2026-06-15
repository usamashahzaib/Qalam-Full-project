import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { analyzeCompetitor } from "@/lib/use-cases/analyze-competitor"
import { errorToStatus } from "@/lib/errors"
import { SupabaseCompetitorRepository } from "@/lib/repositories/supabase/SupabaseCompetitorRepository"

const competitorRepo = new SupabaseCompetitorRepository()

const MONTHLY_LIMIT = 5

const isProOrAbove = (plan: string) => {
  const p = plan.toLowerCase()
  return p === "pro" || p === "agency" || p.startsWith("agency")
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!isProOrAbove(user.plan)) {
      return NextResponse.json({ error: "Competitor research requires Pro plan." }, { status: 403 })
    }

    const runsUsed = await competitorRepo.getRunsUsed(user.id)

    if (runsUsed >= MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: "Monthly research limit reached. Resets next billing cycle.", runsUsed, limit: MONTHLY_LIMIT },
        { status: 429 }
      )
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const postText = String(body.postText || "").trim()
    const postUrl = String(body.postUrl || "").trim()

    const result = await analyzeCompetitor({ postText, userId: user.id, plan: user.plan })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    const analysis = result.data

    await competitorRepo.saveAnalysis(user.id, postText, postUrl || null, analysis)
    await competitorRepo.incrementRunsUsed(user.id, runsUsed)

    return NextResponse.json({ analysis, runsUsed: runsUsed + 1, limit: MONTHLY_LIMIT })
  })(request)
}
