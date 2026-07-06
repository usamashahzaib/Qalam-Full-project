import { NextResponse } from "next/server"
import { requireAuth, getAuthenticatedSession, ensureSupabaseUser } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanStatus } from "@/lib/server/plan-limits-v2"

export async function GET() {
  try {
    const tokenUserId = await requireAuth()
    const session = await getAuthenticatedSession()
    const userEmail = session?.user?.email?.trim().toLowerCase() ?? null

    // tokenUserId is the OAuth sub for LinkedIn users but posts/workspaces use the internal UUID.
    // Resolve to internal UUID so all DB queries use the correct key.
    const supabaseUserId = await ensureSupabaseUser({
      userId: tokenUserId,
      email: userEmail ?? "",
      fullName: session?.user?.name ?? "",
      imageUrl: session?.user?.image ?? null,
    }).catch(() => tokenUserId)

    const supabase = createServiceClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // getPlanStatus is the canonical plan resolver - handles users.plan, plan_usage,
    // admin overrides, and expiry in one place.
    const [planStatus, monthPostsRes, libraryRes, publishedRes] = await Promise.allSettled([
      getPlanStatus(supabaseUserId),
      supabase
        .from("posts")
        .select("engagement_score")
        .eq("user_id", supabaseUserId)
        .gte("created_at", monthStart),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", supabaseUserId),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", supabaseUserId)
        .eq("status", "published")
        .gte("created_at", monthStart),
    ])

    const status = planStatus.status === "fulfilled" ? planStatus.value : null
    const monthPosts =
      monthPostsRes.status === "fulfilled" ? (monthPostsRes.value.data ?? []) : []
    const libraryCount =
      libraryRes.status === "fulfilled" ? (libraryRes.value.count ?? 0) : 0
    const postsPublished =
      publishedRes.status === "fulfilled" ? (publishedRes.value.count ?? 0) : 0

    const planName = status?.plan ?? "Free"
    const planExpiresAt = status?.planExpiresAt ?? null
    const draftsUsed = status?.drafts.used ?? 0
    const draftsTotal = status?.drafts.limit ?? null
    const draftsRemaining = status?.drafts.remaining ?? null
    const carouselsUsed = status?.carousels.used ?? 0

    const scores = monthPosts
      .map((p: { engagement_score?: number | null }) => p.engagement_score)
      .filter((s): s is number => typeof s === "number" && s > 0)
    const avgScore = scores.length
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : null

    const resetDate = (planName.toLowerCase() !== "free" && planExpiresAt)
      ? planExpiresAt
      : new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    const isFree = planName.toLowerCase() === "free"

    return NextResponse.json({
      postsThisMonth: monthPosts.length,
      draftsRemaining,
      draftsUsed,
      draftsTotal,
      libraryPosts: libraryCount,
      avgScore: isFree ? null : avgScore,
      plan: planName,
      carouselsUsed,
      postsPublished,
      resetDate,
      planExpiresAt,
    })
  } catch (err) {
    const msg = (err as Error).message
    return NextResponse.json(
      { error: msg },
      { status: msg === "auth_required" ? 401 : 500 }
    )
  }
}
