const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

export const TOKEN_WARNING_DAYS = 7
export const APPROVAL_STALE_HOURS = 72

/** Monday 00:00 UTC of the week containing `at`. */
export function weekStartUtc(at: Date): Date {
  const day = at.getUTCDay()
  const sinceMonday = (day + 6) % 7
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() - sinceMonday))
}

export type CadenceSummary = {
  target: number
  publishedThisWeek: number
  scheduledThisWeek: number
  onTrack: boolean
  /** Consecutive completed weeks (before the current one) that met the target. */
  streakWeeks: number
}

/**
 * The current week never breaks a streak: it is still in progress. It extends
 * the streak once it meets the target, so the number moves the moment the
 * team ships the last post of the week.
 */
export function summarizeCadence(input: {
  publishedAt: string[]
  scheduledFor: string[]
  target: number
  now: Date
  maxWeeks?: number
}): CadenceSummary {
  const target = Math.max(1, Math.round(input.target))
  const currentWeek = weekStartUtc(input.now).getTime()
  const countsByWeek = new Map<number, number>()
  for (const iso of input.publishedAt) {
    const time = Date.parse(iso)
    if (!Number.isFinite(time) || time > input.now.getTime()) continue
    const week = weekStartUtc(new Date(time)).getTime()
    countsByWeek.set(week, (countsByWeek.get(week) ?? 0) + 1)
  }

  const nextWeek = currentWeek + WEEK_MS
  const scheduledThisWeek = input.scheduledFor.filter((iso) => {
    const time = Date.parse(iso)
    return Number.isFinite(time) && time >= input.now.getTime() && time < nextWeek
  }).length

  const publishedThisWeek = countsByWeek.get(currentWeek) ?? 0
  let streakWeeks = 0
  const maxWeeks = input.maxWeeks ?? 104
  for (let index = 1; index <= maxWeeks; index++) {
    if ((countsByWeek.get(currentWeek - index * WEEK_MS) ?? 0) >= target) streakWeeks++
    else break
  }
  if (publishedThisWeek >= target) streakWeeks++

  return {
    target,
    publishedThisWeek,
    scheduledThisWeek,
    onTrack: publishedThisWeek + scheduledThisWeek >= target,
    streakWeeks,
  }
}

export type LinkedInStatus =
  | { state: "missing" }
  | { state: "expired" }
  | { state: "expiring"; daysLeft: number }
  | { state: "connected"; daysLeft: number | null }

export function linkedInStatus(expiresAt: string | null | undefined, hasAccount: boolean, now: Date): LinkedInStatus {
  if (!hasAccount) return { state: "missing" }
  if (!expiresAt) return { state: "connected", daysLeft: null }
  const remaining = Date.parse(expiresAt) - now.getTime()
  if (!Number.isFinite(remaining) || remaining <= 0) return { state: "expired" }
  const daysLeft = Math.floor(remaining / DAY_MS)
  return daysLeft < TOKEN_WARNING_DAYS ? { state: "expiring", daysLeft } : { state: "connected", daysLeft }
}

export type ClientHealthInput = {
  workspaceId: string
  name: string
  cadence: CadenceSummary
  linkedIn: LinkedInStatus
  pendingApprovals: number
  oldestPendingHours: number | null
  failedPosts: number
  scheduledAtRisk: number
  unusedVoiceDrops: number
}

export type ExceptionSeverity = "critical" | "warning" | "info"

export type ClientException = {
  workspaceId: string
  clientName: string
  severity: ExceptionSeverity
  code:
    | "linkedin_expired"
    | "linkedin_missing"
    | "linkedin_expiring"
    | "posts_failed"
    | "scheduled_at_risk"
    | "approval_stale"
    | "cadence_behind"
    | "voice_drops_waiting"
  message: string
}

const SEVERITY_RANK: Record<ExceptionSeverity, number> = { critical: 0, warning: 1, info: 2 }

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`

export function clientExceptions(client: ClientHealthInput): ClientException[] {
  const out: ClientException[] = []
  const push = (severity: ExceptionSeverity, code: ClientException["code"], message: string) =>
    out.push({ workspaceId: client.workspaceId, clientName: client.name, severity, code, message })

  if (client.linkedIn.state === "expired") {
    push("critical", "linkedin_expired", "LinkedIn access expired. Scheduled posts cannot publish until the client reconnects.")
  } else if (client.linkedIn.state === "missing") {
    push(client.scheduledAtRisk > 0 ? "critical" : "warning", "linkedin_missing", "LinkedIn is not connected. Send the client a connect link.")
  } else if (client.linkedIn.state === "expiring") {
    push("warning", "linkedin_expiring", `LinkedIn access expires in ${plural(client.linkedIn.daysLeft, "day")}.`)
  }

  if (client.failedPosts > 0) push("critical", "posts_failed", `${plural(client.failedPosts, "post")} failed to publish.`)
  if (client.scheduledAtRisk > 0 && client.linkedIn.state !== "missing") {
    push("critical", "scheduled_at_risk", `${plural(client.scheduledAtRisk, "scheduled post")} will not publish with the current LinkedIn access.`)
  }
  if (client.oldestPendingHours !== null && client.oldestPendingHours >= APPROVAL_STALE_HOURS) {
    push("warning", "approval_stale", `An approval has waited ${Math.floor(client.oldestPendingHours / 24)} days for the client.`)
  }
  if (!client.cadence.onTrack) {
    const gap = client.cadence.target - client.cadence.publishedThisWeek - client.cadence.scheduledThisWeek
    push("warning", "cadence_behind", `${plural(gap, "post")} short of this week's target of ${client.cadence.target}.`)
  }
  if (client.unusedVoiceDrops > 0) {
    push("info", "voice_drops_waiting", `${plural(client.unusedVoiceDrops, "client answer")} ready to turn into posts.`)
  }
  return out
}

export function sortExceptions(exceptions: ClientException[]): ClientException[] {
  return [...exceptions].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.clientName.localeCompare(b.clientName))
}

export function healthLevel(exceptions: ClientException[]): "healthy" | ExceptionSeverity {
  if (!exceptions.length) return "healthy"
  return sortExceptions(exceptions)[0].severity
}
