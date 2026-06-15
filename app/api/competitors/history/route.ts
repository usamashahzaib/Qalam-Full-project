import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { SupabaseCompetitorRepository } from "@/lib/repositories/supabase/SupabaseCompetitorRepository"

const competitorRepo = new SupabaseCompetitorRepository()

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const [history, runsUsed] = await Promise.all([
      competitorRepo.listAnalyses(user.id, 5),
      competitorRepo.getRunsUsed(user.id),
    ])
    return NextResponse.json({ history, runsUsed, limit: 5 })
  })(request)
}
