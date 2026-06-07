import { createServiceClient } from "@/lib/server/supabase-rest"

type Feature = "drafts" | "carousels" | "voice" | "research"
type PlanName = "free" | "pro" | "agency"

const LARGE_LIMIT = 999_999
const PLAN_CONFIG: Record<PlanName, Record<Feature, number>> = {
  free: { drafts: 10, carousels: 2, voice: 0, research: 0 },
  pro: { drafts: 60, carousels: 10, voice: 1, research: 5 },
  agency: { drafts: 300, carousels: 50, voice: 5, research: 25 },
}

const normalizePlan = (plan?: string | null): PlanName => {
  const value = String(plan || "free").toLowerCase()
  if (value.includes("agency")) return "agency"
  if (value.includes("pro")) return "pro"
  return "free"
}

const monthStart = () => {
  const date = new Date()
  date.setUTCDate(1)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

const nextMonth = () => {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() + 1, 1)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString()
}

const countRows = async (table: string, userId: string) => {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart())
  return count || 0
}

const getUser = async (userId: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("users")
    .select("id,plan,billing_status,plan_expires_at,remaining_drafts")
    .eq("id", userId)
    .maybeSingle()
  return data
}

export async function getPlanStatus(userId: string) {
  const user = userId ? await getUser(userId).catch(() => null) : null
  const expired = Boolean(user?.plan_expires_at && new Date(user.plan_expires_at).getTime() < Date.now())
  const plan = expired ? "free" : normalizePlan(user?.plan)
  const config = PLAN_CONFIG[plan]
  const used = await countRows("posts", userId).catch(() => 0)
  const carouselsUsed = await countRows("carousel_projects", userId).catch(() => 0)

  return {
    plan,
    limit: config.drafts || LARGE_LIMIT,
    used,
    remaining: Math.max(0, (config.drafts || LARGE_LIMIT) - used),
    resetsAt: nextMonth(),
    carousels: { used: carouselsUsed, limit: config.carousels, remaining: Math.max(0, config.carousels - carouselsUsed) },
  }
}

export async function checkPlanLimit(userId: string, feature: Feature) {
  const status = await getPlanStatus(userId)
  const plan = normalizePlan(status.plan)
  const limit = PLAN_CONFIG[plan][feature] || 0
  const current =
    feature === "drafts" ? status.used :
    feature === "carousels" ? status.carousels.used :
    0
  const remaining = Math.max(0, limit - current)
  const allowed = remaining > 0

  return {
    allowed,
    current,
    limit,
    remaining,
    plan,
    ...(plan === "free" && feature === "carousels" && !allowed ? { message: "upgrade_required" } : {}),
  }
}

export async function decrementDraft(userId: string) {
  const supabase = createServiceClient()
  try {
    const { data, error } = await supabase.rpc("decrement_remaining_drafts", { p_user_id: userId })
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data
      return { success: Boolean(row?.success ?? true), remaining: Number(row?.remaining ?? 0) }
    }
  } catch {}

  const user = await getUser(userId).catch(() => null)
  const remaining = Number(user?.remaining_drafts ?? 0)
  if (remaining <= 0) return { success: false, remaining: 0 }

  const { error } = await supabase
    .from("users")
    .update({ remaining_drafts: remaining - 1, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .gt("remaining_drafts", 0)

  return { success: !error, remaining: error ? remaining : remaining - 1 }
}
