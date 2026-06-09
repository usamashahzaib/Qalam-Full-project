import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanByName } from "@/lib/pricing"

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createServiceClient()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    const [monthPostsRes, libraryRes, usageRes, publishedRes] = await Promise.allSettled([
      supabase
        .from("posts")
        .select("engagement_score")
        .eq("user_id", userId)
        .gte("created_at", monthStart),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("plan_usage")
        .select("plan,ai_drafts_used,carousels_used")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "published")
        .gte("created_at", monthStart),
    ])

    const monthPosts =
      monthPostsRes.status === "fulfilled" ? (monthPostsRes.value.data ?? []) : []
    const libraryCount =
      libraryRes.status === "fulfilled" ? (libraryRes.value.count ?? 0) : 0
    const usageRow =
      usageRes.status === "fulfilled" ? usageRes.value.data : null
    const postsPublished =
      publishedRes.status === "fulfilled" ? (publishedRes.value.count ?? 0) : 0

    const scores = monthPosts
      .map((p: { engagement_score?: number | null }) => p.engagement_score)
      .filter((s): s is number => typeof s === "number" && s > 0)
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null

    const planName = usageRow?.plan ?? "free"
    const plan = getPlanByName(planName)
    const draftsUsed = usageRow?.ai_drafts_used ?? 0
    const draftsTotal = plan.draftsPerMonth
    const draftsRemaining =
      draftsTotal != null ? Math.max(0, draftsTotal - draftsUsed) : null

    return NextResponse.json({
      postsThisMonth: monthPosts.length,
      draftsRemaining,
      draftsUsed,
      draftsTotal,
      libraryPosts: libraryCount,
      avgScore,
      plan: planName,
      carouselsUsed: usageRow?.carousels_used ?? 0,
      postsPublished,
      resetDate,
    })
  } catch (err) {
    const msg = (err as Error).message
    return NextResponse.json(
      { error: msg },
      { status: msg === "auth_required" ? 401 : 500 }
    )
  }
}
