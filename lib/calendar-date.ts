// This helper runs in the browser so the chosen day preserves local wall time,
// including the offset on the target day when daylight saving changes.
export function rescheduledInstant(date: string, previous: string | null): string {
  const [year, month, day] = date.split("-").map(Number)
  const prior = previous ? new Date(previous) : null
  const hours = prior && Number.isFinite(prior.getTime()) ? prior.getHours() : 9
  const minutes = prior && Number.isFinite(prior.getTime()) ? prior.getMinutes() : 0
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}

export function localCalendarDate(instant: string): string {
  const date = new Date(instant)
  if (!Number.isFinite(date.getTime())) return ""
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
