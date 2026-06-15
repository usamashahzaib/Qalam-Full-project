import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

type ScoreRow = { engagement_score: number | null }

export interface GetDashboardMetricsInput {
  userId: string
  month: number
  year: number
}

export interface GetDashboardMetricsOutput {
  postsThisMonth: number
  draftsUsed: number
  carouselsUsed: number
  avgScore: number | null
}

export async function getDashboardMetrics(input: GetDashboardMetricsInput): Promise<Result<GetDashboardMetricsOutput>> {
  const { userId, month, year } = input
  if (!userId || month < 1 || month > 12 || year < 2000) return err({ code: "VALIDATION_ERROR", message: "Valid userId, month, and year are required" })

  try {
    const supabase = createServiceClient()
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString()
    const end = new Date(Date.UTC(year, month, 1)).toISOString()
    const [postsRes, usageRes] = await Promise.all([
      supabase.from("posts").select("engagement_score").eq("user_id", userId).gte("created_at", start).lt("created_at", end),
      supabase.from("plan_usage").select("ai_drafts_used, carousels_used").eq("user_id", userId).maybeSingle(),
    ])

    if (postsRes.error) return err({ code: "INTERNAL_ERROR", message: postsRes.error.message })
    if (usageRes.error) return err({ code: "INTERNAL_ERROR", message: usageRes.error.message })

    const posts = (postsRes.data || []) as ScoreRow[]
    const scores = posts.map((p) => p.engagement_score).filter((v): v is number => typeof v === "number" && v > 0)
    return ok({
      postsThisMonth: posts.length,
      draftsUsed: usageRes.data?.ai_drafts_used ?? 0,
      carouselsUsed: usageRes.data?.carousels_used ?? 0,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to load dashboard metrics", cause })
  }
}
