/**
 * Launch offer: every account gets at least Pro until the date in NEXT_PUBLIC_FREE_PRO_UNTIL
 * (for example "2027-02-04"). Pro stops at the start of that day, UTC. Nothing is written to the
 * database, so accounts return to their real plan on their own. Unset or invalid means off.
 * The value is read at build time, so changing it needs a redeploy.
 */

const endsAt = (): number | null => {
  const raw = process.env.NEXT_PUBLIC_FREE_PRO_UNTIL?.trim()
  if (!raw) return null
  const time = Date.parse(raw)
  return Number.isNaN(time) ? null : time
}

export function isFreeProActive(now = Date.now()): boolean {
  const end = endsAt()
  return end !== null && now < end
}

/** Raises Free and Solo to Pro while the offer runs. Pro and Agency are left alone. */
export function withFreePro<T extends string>(plan: T, now = Date.now()): T | "Pro" {
  if (!isFreeProActive(now)) return plan
  const value = plan.toLowerCase()
  return value === "free" || value === "solo" ? "Pro" : plan
}

/** "4 February 2027", or null when the offer is off. */
export function freeProEndLabel(now = Date.now()): string | null {
  const end = endsAt()
  if (end === null || now >= end) return null
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(end)
}
