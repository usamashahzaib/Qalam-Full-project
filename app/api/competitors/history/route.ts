import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { SupabaseCompetitorRepository } from "@/lib/repositories/supabase/SupabaseCompetitorRepository"

const competitorRepo = new SupabaseCompetitorRepository()

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response

    const [history, runsUsed] = await Promise.all([
      competitorRepo.listAnalyses(planCheck.workspaceId, 5),
      competitorRepo.getRunsUsed(user.id),
    ])
    return NextResponse.json({ history, runsUsed, limit: planCheck.limits.researchRunsPerMonth })
  })(request)
}
