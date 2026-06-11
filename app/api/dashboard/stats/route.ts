import { NextResponse } from "next/server"
import { requireAuth, getAuthenticatedSession } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanByName } from "@/lib/pricing"

export async function GET() {
  try {
    const userId = await requireAuth()
    const session = await getAuthenticatedSession()
    const userEmail = session?.user?.email?.trim().toLowerCase() ?? null
    const supabase = createServiceClient()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    const [monthPostsRes, libraryRes, usageRes, publishedRes, overrideRes] = await Promise.allSettled([
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
      supabase
        .from("user_overrides")
        .select("plan_override, draft_limit_override, expires_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    const monthPosts =
      monthPostsRes.status === "fulfilled" ? (monthPostsRes.value.data ?? []) : []
    const libraryCount =
      libraryRes.status === "fulfilled" ? (libraryRes.value.count ?? 0) : 0
    const usageRow =
      usageRes.status === "fulfilled" ? usageRes.value.data : null
    const postsPublished =
      publishedRes.status === "fulfilled" ? (publishedRes.value.count ?? 0) : 0
    const override =
      overrideRes.status === "fulfilled" ? overrideRes.value.data : null

    const scores = monthPosts
      .map((p: { engagement_score?: number | null }) => p.engagement_score)
      .filter((s): s is number => typeof s === "number" && s > 0)
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null

    let planName = usageRow?.plan ?? "free"
    // Apply admin override if active
    if (override?.plan_override && (!override.expires_at || new Date(override.expires_at) > new Date())) {
      planName = override.plan_override
    }
    const plan = getPlanByName(planName)
    const draftsUsed = usageRow?.ai_drafts_used ?? 0
    let draftsTotal = plan.draftsPerMonth
    if (typeof override?.draft_limit_override === "number" && override.draft_limit_override >= 0 &&
        (!override.expires_at || new Date(override.expires_at) > new Date())) {
      draftsTotal = override.draft_limit_override
    }
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
