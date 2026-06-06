import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"
import { createClient } from "@supabase/supabase-js"
import { PLAN_USAGE_LIMITS, type PlanName } from "@/lib/server/plan-limits"

type PostRow = {
  id: string
  title: string | null
  content: string | null
  status: string
  engagement_score: number | null
  topic: string | null
  role_profile: string | null
  created_at: string | null
  updated_at: string | null
}

type UsageRow = {
  plan: string
  ai_drafts_used: number
  carousels_used: number
}

const normalizePlan = (plan?: string): PlanName => {
  const value = String(plan || "free").toLowerCase()
  return value === "solo" || value === "pro" || value === "agency" ? value : "free"
}

const timeAgo = (iso?: string | null) => {
  const diff = Date.now() - new Date(iso || Date.now()).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const [{ data: posts, error: postsError }, { data: usage }, { data: carousels }] = await Promise.all([
      supabase.from("posts").select("id,title,content,status,engagement_score,topic,role_profile,created_at,updated_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("plan_usage").select("plan,ai_drafts_used,carousels_used").eq("user_id", userId).maybeSingle(),
      supabase.from("carousel_projects").select("id,title,topic,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ])

    if (postsError) return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 })

    const rows = (posts || []) as PostRow[]
    const total = rows.length
    const drafts = rows.filter((p) => p.status === "draft").length
    const published = rows.filter((p) => p.status === "published").length
    const scores = rows.map((p) => p.engagement_score).filter((score): score is number => typeof score === "number")
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const plan = normalizePlan((usage as UsageRow | null)?.plan)
    const limits = PLAN_USAGE_LIMITS[plan]
    const recentPosts = rows.slice(0, 5)
    const postActivity = recentPosts.map((post) => ({
      id: `post-${post.id}`,
      label: `Generated post about ${post.topic || post.title || "Untitled"}`,
      time: timeAgo(post.created_at || post.updated_at),
    }))
    const carouselActivity = (carousels || []).map((item) => ({
      id: `carousel-${item.id}`,
      label: `Created carousel about ${item.topic || item.title || "Untitled"}`,
      time: timeAgo(item.created_at),
    }))

    return NextResponse.json({
      total,
      drafts,
      published,
      avgScore,
      recentPosts,
      usage: {
        plan,
        drafts: { used: Number((usage as UsageRow | null)?.ai_drafts_used || 0), total: limits.ai_drafts },
        carousels: { used: Number((usage as UsageRow | null)?.carousels_used || 0), total: limits.carousels },
      },
      activity: [...postActivity, ...carouselActivity].slice(0, 8),
    })
  } catch (error) {
    const message = (error as Error).message || "Failed to load dashboard"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
