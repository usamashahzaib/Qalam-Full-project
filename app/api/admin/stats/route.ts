import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getRedis } from "@/lib/server/redis"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  let admin: { email: string; userId: string }
  try {
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const supabase = createServiceClient()

  // Parallel fetch everything
  const [usersResult, planUsageResult, recentUsersResult, circuitResult] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("plan_usage").select("plan, ai_drafts_used, carousels_used, hooks_used, analyses_used, user_id"),
    supabase.from("users").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(8),
    (async () => {
      const redis = getRedis()
      if (!redis) return { groq: "no-redis", gemini: "no-redis" }
      try {
        const [groq, gemini] = await Promise.all([
          redis.get("circuit:groq"),
          redis.get("circuit:gemini"),
        ])
        const toState = (v: unknown) => {
          if (!v) return "closed"
          if (typeof v === "string") return v
          if (typeof v === "object" && v !== null && "state" in v) return String((v as Record<string, unknown>).state)
          return "closed"
        }
        return { groq: toState(groq), gemini: toState(gemini) }
      } catch {
        return { groq: "unknown", gemini: "unknown" }
      }
    })(),
  ])

  const totalUsers = usersResult.count ?? 0
  const planRows = planUsageResult.data ?? []

  // Plan breakdown counts
  const planCounts = { free: 0, solo: 0, pro: 0, agency: 0 }
  let totalDrafts = 0
  let totalCarousels = 0
  let totalHooks = 0

  // Deduplicate by user_id - only count the latest row per user
  const seenUsers = new Set<string>()
  for (const row of planRows) {
    totalDrafts += row.ai_drafts_used || 0
    totalCarousels += row.carousels_used || 0
    totalHooks += row.hooks_used || 0
    if (row.user_id && seenUsers.has(row.user_id)) continue
    if (row.user_id) seenUsers.add(row.user_id)
    const p = String(row.plan || "free").toLowerCase()
    if (p.includes("agency")) planCounts.agency++
    else if (p.includes("pro")) planCounts.pro++
    else if (p.includes("solo")) planCounts.solo++
    else planCounts.free++
  }

  // Users in plan_usage but not counted yet (total registered vs plan_usage rows)
  const registered = totalUsers

  const recentUsers = (recentUsersResult.data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.full_name || u.email?.split("@")[0] || "Unknown",
    joinedAt: u.created_at,
  }))

  // Admin's own internal Supabase UUID for self-assign overrides.
  // session.user.id is the OAuth sub (LinkedIn sub) for OAuth users, not the internal UUID.
  // Overrides stored under the internal UUID are reliably found by all plan-resolution paths.
  let selfId = admin.userId
  try {
    const { data: selfUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", admin.email.trim().toLowerCase())
      .maybeSingle()
    if (selfUser?.id) selfId = selfUser.id
  } catch { /* fall back to OAuth sub */ }

  return NextResponse.json({
    stats: {
      totalUsers: registered,
      planCounts,
      usage: { totalDrafts, totalCarousels, totalHooks },
    },
    recentUsers,
    circuits: circuitResult,
    selfId,
  })
}
