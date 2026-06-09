import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()

    const { data: rows } = await supabase
      .from("competitor_analyses")
      .select("id, post_text, post_url, hook_structure, engagement_factors, content_pattern, improvements, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    const { data: usage } = await supabase
      .from("plan_usage")
      .select("competitor_runs_used")
      .eq("user_id", user.id)
      .maybeSingle()

    const runsUsed = (usage as { competitor_runs_used?: number } | null)?.competitor_runs_used ?? 0

    return NextResponse.json({ history: rows || [], runsUsed, limit: 5 })
  })(request)
}
