export const addMonthsIso = (iso: string | null | undefined, months = 1) => {
  if (!iso) return null
  const base = new Date(iso)
  if (Number.isNaN(base.getTime())) return null
  const day = base.getDate()
  const next = new Date(base)
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
  return next.toISOString()
}

export type BillingCycle = "monthly" | "quarterly" | "annual"

export const billingCycleMonths = (billingCycle: string | null | undefined): number =>
  billingCycle === "annual" ? 12 : billingCycle === "quarterly" ? 3 : 1

const addUtcCalendarMonths = (base: Date, months: number, endOfDay: boolean) => {
  const day = base.getUTCDate()
  const targetMonth = base.getUTCMonth() + months
  const targetYear = base.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
  return new Date(Date.UTC(
    targetYear,
    normalizedMonth,
    Math.min(day, lastDay),
    endOfDay ? 23 : base.getUTCHours(),
    endOfDay ? 59 : base.getUTCMinutes(),
    endOfDay ? 59 : base.getUTCSeconds(),
    endOfDay ? 999 : base.getUTCMilliseconds(),
  ))
}

/** Calendar period fallback for payment providers that do not send a period end. */
export const addBillingCycleIso = (billingCycle: string | null | undefined, from = new Date()): string =>
  addUtcCalendarMonths(from, billingCycleMonths(billingCycle), true).toISOString()

/** A date chosen in the admin UI means access through the end of that UTC calendar day. */
export const normalizeSelectedPlanExpiry = (value: string | null | undefined): string | null => {
  if (!value) return null
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(value)
  if (dateOnly) return `${dateOnly[1]}T23:59:59.999Z`
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export const endOfPlanExpiryDay = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

export const isPlanExpired = (iso: string | null | undefined, now = new Date()) => {
  const expiry = endOfPlanExpiryDay(iso)
  return expiry ? now.getTime() > expiry.getTime() : false
}

export const getMonthlyQuotaWindow = (
  planStartedAt: string | null | undefined,
  billingCycle: string | null | undefined,
  now = new Date(),
) => {
  if (!planStartedAt || !["monthly", "quarterly", "annual"].includes(String(billingCycle))) return null
  const start = new Date(planStartedAt)
  if (Number.isNaN(start.getTime()) || now < start) return null

  let monthIndex = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth()
  monthIndex = Math.max(0, monthIndex)
  let windowStart = addUtcCalendarMonths(start, monthIndex, false)
  if (windowStart > now && monthIndex > 0) {
    monthIndex -= 1
    windowStart = addUtcCalendarMonths(start, monthIndex, false)
  }
  return { windowStart, windowEnd: addUtcCalendarMonths(start, monthIndex + 1, false) }
}

export const resolvePlanExpiry = (
  storedExpiry?: string | null,
  boughtAt?: string | null,
  months = 1
) => storedExpiry || addMonthsIso(boughtAt, months) || null

export const formatPlanDate = (iso?: string | null) => {
  if (!iso) return "-"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}
