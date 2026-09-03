import "server-only"
import { cache } from "react"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanStatus } from "@/lib/server/plan-limits-v2"
import { getWorkspaceSessionContext, resolveEffectivePlan, resolveWorkspaceBillingPrincipal } from "@/lib/server/workspace"
import { checkWorkspaceUsage } from "@/lib/server/workspace-usage"

export type DashboardStats = {
  postsThisMonth: number
  draftsRemaining: number | null
  draftsUsed: number
  draftsTotal: number | null
  libraryPosts: number
  avgScore: number | null
  plan: string
  carouselsUsed: number
  postsPublished: number
  resetDate: string
  planExpiresAt?: string | null
  // Agency-only: this client workspace's own 60-draft allowance, distinct
  // from the account-wide draftsUsed/draftsTotal above.
  workspaceDraftsUsed: number | null
  workspaceDraftsLimit: number | null
}

export type DashboardPost = {
  id: string
  title: string
  date: string
  score: number | null
  status: string
}

export type UsageDay = {
  day: number
  draftsUsed: number
}

// Per-request memoization: all parallel route slots share one context/auth lookup
export const getSessionContext = cache(getWorkspaceSessionContext)

export async function fetchDashboardStats(supabaseUserId: string, workspaceId: string, email?: string | null): Promise<DashboardStats> {
  const supabase = createServiceClient()
  const billingPrincipal = await resolveWorkspaceBillingPrincipal(workspaceId, supabaseUserId, email)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Plan/quota status is per-user (each seat has its own allowance), but post
  // counts must reflect the whole workspace - otherwise a teammate's dashboard
  // understates activity everyone else on the team already produced.
  const [planStatus, effectivePlan, monthPostsRes, libraryRes, publishedRes] = await Promise.allSettled([
    getPlanStatus(billingPrincipal.userId),
    resolveEffectivePlan(workspaceId, billingPrincipal.email, billingPrincipal.userId),
    supabase
      .from("posts")
      .select("engagement_score")
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStart),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "published")
      .gte("created_at", monthStart),
  ])

  const status = planStatus.status === "fulfilled" ? planStatus.value : null
  const workspacePlan = effectivePlan.status === "fulfilled" ? effectivePlan.value : null
  const monthPosts =
    monthPostsRes.status === "fulfilled" ? (monthPostsRes.value.data ?? []) : []
  const libraryCount =
    libraryRes.status === "fulfilled" ? (libraryRes.value.count ?? 0) : 0
  const postsPublished =
    publishedRes.status === "fulfilled" ? (publishedRes.value.count ?? 0) : 0

  const planName = workspacePlan?.plan ?? status?.plan ?? "Free"
  const planExpiresAt = workspacePlan?.expiresAt ?? status?.planExpiresAt ?? null
  const draftsUsed = status?.drafts.used ?? 0
  const draftsTotal = status?.drafts.limit ?? null
  const draftsRemaining = status?.drafts.remaining ?? null
  let carouselsUsed = status?.carousels.used ?? 0

  type PostRow = { engagement_score?: number | null }
  const scores = (monthPosts as PostRow[])
    .map((p) => p.engagement_score)
    .filter((s): s is number => typeof s === "number" && s > 0)
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null

  const isFree = planName.toLowerCase() === "free"
  const resetDate =
    !isFree && planExpiresAt
      ? planExpiresAt
      : new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  let workspaceDraftsUsed: number | null = null
  let workspaceDraftsLimit: number | null = null
  if (planName.toLowerCase() === "agency") {
    const [draftUsage, carouselUsage] = await Promise.all([
      checkWorkspaceUsage(workspaceId, "drafts").catch(() => null),
      checkWorkspaceUsage(workspaceId, "carousels").catch(() => null),
    ])
    if (draftUsage) {
      workspaceDraftsUsed = draftUsage.used
      workspaceDraftsLimit = draftUsage.limit
    }
    if (carouselUsage) carouselsUsed = carouselUsage.used
  }

  return {
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
    workspaceDraftsUsed,
    workspaceDraftsLimit,
  }
}

export async function fetchRecentPosts(workspaceId: string): Promise<DashboardPost[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("posts")
    .select("id,title,content,engagement_score,status,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) throw new Error("Failed to load posts")

  type Row = {
    id: string
    title?: string | null
    content?: string | null
    engagement_score?: number | null
    status: string
    created_at: string
  }

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    title: (row.title || row.content || "Untitled post").split("\n")[0].slice(0, 100),
    date: row.created_at,
    score: row.engagement_score ?? null,
    status: row.status ?? "draft",
  }))
}

export async function fetchDashboardUsage(workspaceId: string): Promise<UsageDay[]> {
  const supabase = createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data } = await supabase
    .from("posts")
    .select("created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", monthStart)
    .order("created_at", { ascending: true })
  const rows = (data ?? []) as { created_at: string }[]
  const today = now.getDate()
  return Array.from({ length: today }, (_, i) => i + 1).map((day) => ({
    day,
    draftsUsed: rows.filter((r) => new Date(r.created_at).getDate() === day).length,
  }))
}
