import "server-only"
import { createServiceClient, sanitizeOrFilterValue } from "./supabase-rest"
import { sendTransactionalEmail } from "./email"

export interface PlanStatus {
  plan: string
  originalPlan: string
  isActive: boolean
  expiresAt: string | null
  renewalDue: boolean
  daysUntilExpiry: number | null
}

type UserPlanRow = {
  id: string
  email?: string | null
  full_name?: string | null
  plan?: string | null
  plan_expires_at?: string | null
  plan_started_at?: string | null
  billing_cycle?: string | null
}

const MS_DAY = 24 * 60 * 60 * 1000

const normalizePlan = (plan?: string | null) => {
  const value = String(plan || "").toLowerCase()
  if (value.includes("agency")) return "Agency"
  if (value.includes("pro")) return "Pro"
  if (value.includes("solo")) return "Solo"
  return "Free"
}

const endOfUtcDay = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const supabase = createServiceClient()
  const safeId = sanitizeOrFilterValue(userId)
  const { data: user } = await supabase
    .from("users")
    .select("id, plan, plan_expires_at, plan_started_at, billing_cycle")
    .or(`id.eq.${safeId},external_user_id.eq.${safeId}`)
    .maybeSingle()

  if (!user) {
    return { plan: "Free", originalPlan: "Free", isActive: true, expiresAt: null, renewalDue: false, daysUntilExpiry: null }
  }

  const originalPlan = normalizePlan((user as UserPlanRow).plan)
  const expiresAt = (user as UserPlanRow).plan_expires_at ? endOfUtcDay((user as UserPlanRow).plan_expires_at as string) : null
  if (originalPlan === "Free" || !expiresAt) {
    return { plan: originalPlan, originalPlan, isActive: true, expiresAt: null, renewalDue: false, daysUntilExpiry: null }
  }

  const now = new Date()
  const isActive = now <= expiresAt
  const daysUntilExpiry = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / MS_DAY))
  return {
    plan: isActive ? originalPlan : "Free",
    originalPlan,
    isActive,
    expiresAt: expiresAt.toISOString(),
    renewalDue: isActive && daysUntilExpiry <= 3 && daysUntilExpiry > 0,
    daysUntilExpiry: isActive ? daysUntilExpiry : 0,
  }
}

export async function checkAndDowngradeIfExpired(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const safeId = sanitizeOrFilterValue(userId)
  const status = await getPlanStatus(userId)
  if (status.isActive || status.originalPlan === "Free") return false

  const { data: userData } = await supabase
    .from("users")
    .select("email, full_name")
    .or(`id.eq.${safeId},external_user_id.eq.${safeId}`)
    .maybeSingle()

  await supabase
    .from("users")
    .update({
      plan: "Free",
      plan_expires_at: null,
      billing_cycle: null,
      reminder_sent_3d: false,
      reminder_sent_1d: false,
      updated_at: new Date().toISOString(),
    })
    .or(`id.eq.${safeId},external_user_id.eq.${safeId}`)

  const user = userData as Pick<UserPlanRow, "email" | "full_name"> | null
  if (user?.email) {
    await sendTransactionalEmail({
      to: user.email,
      subject: "Your Qalam plan has expired",
      text: `Hi ${user.full_name || "there"},\n\nYour Qalam ${status.originalPlan} plan expired on ${status.expiresAt}. You have been downgraded to the Free plan.\n\nTo restore your paid features, upgrade at: https://byqalam.com/pricing\n\n- The Qalam team`,
    }).catch(() => undefined)
  }

  return true
}

export async function sendExpiryReminders(): Promise<{ sent: number; downgraded: number }> {
  const supabase = createServiceClient()
  const now = new Date()
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const endToday = new Date(startToday.getTime() + MS_DAY - 1)
  const startTomorrow = new Date(startToday.getTime() + MS_DAY)
  const endTomorrow = new Date(startTomorrow.getTime() + MS_DAY - 1)
  const startThreeDays = new Date(startToday.getTime() + 3 * MS_DAY)
  const endThreeDays = new Date(startThreeDays.getTime() + MS_DAY - 1)
  let sent = 0
  let downgraded = 0

  const sendReminder = async (days: 1 | 3, from: Date, to: Date) => {
    const flag = days === 3 ? "reminder_sent_3d" : "reminder_sent_1d"
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name, plan, plan_expires_at")
      .neq("plan", "Free")
      .gte("plan_expires_at", from.toISOString())
      .lte("plan_expires_at", to.toISOString())
      .eq(flag, false)

    for (const user of (users || []) as UserPlanRow[]) {
      if (!user.email) continue
      await sendTransactionalEmail({
        to: user.email,
        subject: days === 3 ? `Your Qalam ${user.plan} plan expires in 3 days` : `Your Qalam ${user.plan} plan expires tomorrow`,
        text: `Hi ${user.full_name || "there"},\n\nYour Qalam ${user.plan} plan expires on ${user.plan_expires_at}.\n\nRenew now to keep your paid features: https://byqalam.com/pricing\n\n- The Qalam team`,
      }).catch(() => undefined)
      await supabase.from("users").update({ [flag]: true }).eq("id", user.id)
      sent++
    }
  }

  await sendReminder(3, startThreeDays, endThreeDays)
  await sendReminder(1, startTomorrow, endTomorrow)

  const { data: expiringToday } = await supabase
    .from("users")
    .select("id, email, full_name, plan, plan_expires_at")
    .neq("plan", "Free")
    .gte("plan_expires_at", startToday.toISOString())
    .lte("plan_expires_at", endToday.toISOString())

  for (const user of (expiringToday || []) as UserPlanRow[]) {
    if (!user.email) continue
    await sendTransactionalEmail({
      to: user.email,
      subject: `Your Qalam ${user.plan} plan expires today`,
      text: `Hi ${user.full_name || "there"},\n\nYour Qalam ${user.plan} plan expires today (${user.plan_expires_at}).\n\nRenew now to avoid losing access: https://byqalam.com/pricing\n\n- The Qalam team`,
    }).catch(() => undefined)
    sent++
  }

  const { data: expiredUsers } = await supabase
    .from("users")
    .select("id")
    .neq("plan", "Free")
    .lt("plan_expires_at", startToday.toISOString())

  for (const user of (expiredUsers || []) as Pick<UserPlanRow, "id">[]) {
    if (await checkAndDowngradeIfExpired(user.id)) downgraded++
  }

  return { sent, downgraded }
}

export function getQuotaResetDate(planStartedAt: string | null, billingCycle: string | null): Date | null {
  if (!planStartedAt || billingCycle !== "annual") return null
  const start = new Date(planStartedAt)
  if (Number.isNaN(start.getTime())) return null
  const windowsElapsed = Math.floor((Date.now() - start.getTime()) / (30 * MS_DAY))
  return new Date(start.getTime() + (windowsElapsed + 1) * 30 * MS_DAY)
}
