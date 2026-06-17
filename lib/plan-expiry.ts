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

export const resolvePlanExpiry = (
  storedExpiry?: string | null,
  boughtAt?: string | null,
  months = 1
) => addMonthsIso(boughtAt, months) || storedExpiry || null

export const formatPlanDate = (iso?: string | null) => {
  if (!iso) return "-"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
