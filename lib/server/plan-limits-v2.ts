import { createServiceClient } from "./supabase-rest"

export type Feature = "drafts" | "carousels" | "voice" | "research"
export type PlanName = "free" | "solo" | "pro" | "agency"

const PLAN_CONFIG: Record<PlanName, Record<Feature, number>> = {
  free: { drafts: 5, carousels: 1, voice: 0, research: 0 },
  solo: { drafts: 30, carousels: 3, voice: 0, research: 0 },
  pro: { drafts: 60, carousels: 10, voice: 1, research: 5 },
  agency: { drafts: 300, carousels: 50, voice: 5, research: 25 },
}

const normalizePlan = (plan?: string | null): PlanName => {
  const value = String(plan || "").toLowerCase()
  if (value.includes("agency")) return "agency"
  if (value.includes("pro")) return "pro"
  if (value.includes("solo")) return "solo"
  return "free"
}

const getMonthBounds = () => {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function getPlanStatus(userId: string) {
  const supabase = createServiceClient()
  const { start, end } = getMonthBounds()

  const { data: user } = await supabase
    .from("users")
    .select("plan, plan_expires_at, remaining_drafts")
    .eq("id", userId)
    .single()

  const expired = user?.plan_expires_at && new Date(user.plan_expires_at) < new Date()
  const plan = expired ? "free" : normalizePlan(user?.plan)
  const config = PLAN_CONFIG[plan]

  const { count: postsCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end)

  const { count: carouselsCount } = await supabase
    .from("carousels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end)

  return {
    plan,
    limit: config.drafts,
    used: postsCount || 0,
    remaining: Math.max(0, config.drafts - (postsCount || 0)),
    resetsAt: end,
    carousels: {
      used: carouselsCount || 0,
      limit: config.carousels,
      remaining: Math.max(0, config.carousels - (carouselsCount || 0)),
    },
    voice: config.voice,
    research: config.research,
  }
}

export async function checkPlanLimit(userId: string, feature: Feature) {
  const status = await getPlanStatus(userId)
  const config = PLAN_CONFIG[status.plan as PlanName]
  const limit = config[feature] || 0
  const current =
    feature === "drafts"
      ? status.used
      : feature === "carousels"
        ? status.carousels.used
        : 0
  const remaining = Math.max(0, limit - current)

  return { allowed: remaining > 0, current, limit, remaining, plan: status.plan }
}

export async function decrementDraft(userId: string) {
  const supabase = createServiceClient()

  try {
    const { data, error } = await supabase.rpc("atomic_decrement_draft", { p_user_id: userId })
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data
      return { success: Boolean(row?.success ?? true), remaining: Number(row?.remaining ?? 0) }
    }
  } catch (e) {
    console.error("[decrementDraft] RPC failed:", e)
  }

  // Fallback: read-then-update with row-level guard
  const { data: user } = await supabase
    .from("users")
    .select("remaining_drafts")
    .eq("id", userId)
    .single()

  const current = Number(user?.remaining_drafts ?? 0)
  if (current <= 0) return { success: false, remaining: 0 }

  const { data: updated, error } = await supabase
    .from("users")
    .update({ remaining_drafts: current - 1, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .gt("remaining_drafts", 0)
    .select("remaining_drafts")
    .single()

  if (error || !updated) return { success: false, remaining: 0 }
  return { success: true, remaining: updated.remaining_drafts }
}

export function isFeatureAllowed(plan: string, feature: string): boolean {
  const normalized = normalizePlan(plan)
  const config = PLAN_CONFIG[normalized]
  if (feature === "carousel" || feature === "carousel_standard") return config.carousels > 0
  if (feature === "voice" || feature === "voiceProfile") return config.voice > 0
  if (feature === "research" || feature === "competitorResearch") return config.research > 0
  if (feature === "approvalWorkflow" || feature === "teamSeats") return normalized === "agency"
  if (feature === "basic_analytics") return normalized !== "free"
  return normalized !== "free"
}
