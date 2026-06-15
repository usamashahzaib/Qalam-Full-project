import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { analyzeCompetitor } from "@/lib/use-cases/analyze-competitor"
import { errorToStatus } from "@/lib/errors"

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

    const supabase = createServiceClient()

    const { data: usage } = await supabase
      .from("plan_usage")
      .select("competitor_runs_used")
      .eq("user_id", user.id)
      .maybeSingle()

    const runsUsed = (usage as { competitor_runs_used?: number } | null)?.competitor_runs_used ?? 0

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
      return NextResponse.json({ error: result.error.userMessage ?? result.error.message }, { status: errorToStatus(result.error.code) })
    }

    const analysis = result.data

    await supabase.from("competitor_analyses").insert({
      user_id: user.id,
      post_text: postText.slice(0, 2000),
      post_url: postUrl || null,
      hook_structure: analysis.hookStructure,
      engagement_factors: analysis.engagementFactors,
      content_pattern: analysis.contentPattern,
      improvements: analysis.improvements,
    })

    await supabase
      .from("plan_usage")
      .update({ competitor_runs_used: runsUsed + 1 })
      .eq("user_id", user.id)

    return NextResponse.json({ analysis, runsUsed: runsUsed + 1, limit: MONTHLY_LIMIT })
  })(request)
}
