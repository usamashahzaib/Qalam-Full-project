import { NextResponse } from "next/server"
import { requireAuth, getAuthenticatedSession, ensureSupabaseUser } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanByName } from "@/lib/pricing"
import { resolvePlanExpiry } from "@/lib/plan-expiry"

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

    const [monthPostsRes, libraryRes, usageRes, publishedRes, overrideRes, usersPlanRes, paymentRes] = await Promise.allSettled([
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
        .from("plan_usage")
        .select("plan,ai_drafts_used,carousels_used,cycle_start,cycle_end")
        .or(`user_id.eq.${supabaseUserId},user_id.eq.${tokenUserId}`)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", supabaseUserId)
        .eq("status", "published")
        .gte("created_at", monthStart),
      supabase
        .from("user_overrides")
        .select("plan_override, draft_limit_override, expires_at")
        .or(`user_id.eq.${supabaseUserId},user_id.eq.${tokenUserId}`)
        .limit(1)
        .maybeSingle(),
      // users.plan + plan_expires_at are updated by payment webhook - authoritative source
      supabase
        .from("users")
        .select("plan,plan_expires_at,created_at")
        .or(`id.eq.${supabaseUserId},external_user_id.eq.${tokenUserId}`)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("created_at,processed_at")
        .eq("user_id", supabaseUserId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
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
    const usersPlanRow =
      usersPlanRes.status === "fulfilled" ? (usersPlanRes.value as { data: { plan?: string | null; plan_expires_at?: string | null; created_at?: string | null } | null }).data : null
    const paymentRow =
      paymentRes.status === "fulfilled" ? (paymentRes.value as { data: { created_at?: string | null; processed_at?: string | null } | null }).data : null
    const boughtAt = paymentRow?.processed_at || paymentRow?.created_at || usageRow?.cycle_start || usersPlanRow?.created_at || null
    const planExpiresAt = resolvePlanExpiry(usersPlanRow?.plan_expires_at || usageRow?.cycle_end, boughtAt)

    const scores = monthPosts
      .map((p: { engagement_score?: number | null }) => p.engagement_score)
      .filter((s): s is number => typeof s === "number" && s > 0)
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null

    const PLAN_PRIORITY: Record<string, number> = { free: 0, solo: 1, pro: 2, agency: 3 }
    let planName = usageRow?.plan ?? "free"
    // Elevate to users.plan if it's higher (payment webhook updates users.plan authoritatively)
    const usersPlanNorm = (usersPlanRow?.plan ?? "").toLowerCase()
    if ((PLAN_PRIORITY[usersPlanNorm] ?? 0) > (PLAN_PRIORITY[planName.toLowerCase()] ?? 0)) {
      planName = usersPlanRow!.plan!
    }
    // Downgrade to Free if subscription has expired
    if (planName.toLowerCase() !== "free" && planExpiresAt && new Date(planExpiresAt) < now) {
      planName = "free"
    }
    // Apply admin override if active
    if (override?.plan_override && (!override.expires_at || new Date(override.expires_at) > now)) {
      planName = override.plan_override
    }
    const plan = getPlanByName(planName)
    const draftsUsed = usageRow?.ai_drafts_used ?? 0
    let draftsTotal = plan.draftsPerMonth
    if (typeof override?.draft_limit_override === "number" && override.draft_limit_override >= 0 &&
        (!override.expires_at || new Date(override.expires_at) > now)) {
      draftsTotal = override.draft_limit_override
    }
    const draftsRemaining =
      draftsTotal != null ? Math.max(0, draftsTotal - draftsUsed) : null

    // For paid plans use the real expiry/renewal date; for Free use start of next month
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
      carouselsUsed: usageRow?.carousels_used ?? 0,
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
