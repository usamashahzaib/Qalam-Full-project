import { weekStartUtc } from "@/lib/agency/health"

const HOUR_MS = 60 * 60 * 1000
const WEEK_MS = 7 * 24 * HOUR_MS

export type ProofMetrics = { impressions: number; reactions: number; comments: number; reposts: number }

export type ProofPost = {
  title: string
  excerpt: string
  publishedAt: string
  url: string | null
  metrics: ProofMetrics | null
}

export type ProofSnapshot = {
  version: 1
  workspaceName: string
  brandingColor: string | null
  periodStart: string
  periodEnd: string
  generatedAt: string
  cadenceTarget: number
  weeksInPeriod: number
  weeksOnTarget: number
  streakWeeks: number
  totals: ProofMetrics & { postsPublished: number; postsWithMetrics: number }
  approvals: { decided: number; autoApproved: number; medianHoursToDecision: number | null }
  topPost: ProofPost | null
  posts: ProofPost[]
}

export type ProofInput = {
  workspaceName: string
  brandingColor: string | null
  cadenceTarget: number
  streakWeeks: number
  periodStart: Date
  periodEnd: Date
  posts: { title: string | null; content: string | null; published_at: string; linkedin_post_id: string | null }[]
  metricsByPostIndex: (ProofMetrics | null)[]
  approvals: { created_at: string; decided_at: string | null; auto_approved: boolean; status: string }[]
}

export function linkedInPostUrl(urn: string | null): string | null {
  if (!urn || !/^urn:li:(share|ugcPost|activity):[A-Za-z0-9_-]+$/.test(urn)) return null
  return `https://www.linkedin.com/feed/update/${urn}/`
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const excerptOf = (content: string | null) => {
  const flat = (content || "").replace(/\s+/g, " ").trim()
  return flat.length > 220 ? `${flat.slice(0, 217).trimEnd()}...` : flat
}

/** Only complete weeks inside the period count toward "weeks on target". */
export function weeklyTargetStats(publishedAt: string[], target: number, start: Date, end: Date) {
  const firstFullWeek = weekStartUtc(new Date(start.getTime() + WEEK_MS - 1))
  const counts = new Map<number, number>()
  for (const iso of publishedAt) {
    const week = weekStartUtc(new Date(iso)).getTime()
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  let weeksInPeriod = 0
  let weeksOnTarget = 0
  for (let week = firstFullWeek.getTime(); week + WEEK_MS <= end.getTime(); week += WEEK_MS) {
    weeksInPeriod++
    if ((counts.get(week) ?? 0) >= target) weeksOnTarget++
  }
  return { weeksInPeriod, weeksOnTarget }
}

export function buildProofSnapshot(input: ProofInput, generatedAt = new Date()): ProofSnapshot {
  const posts: ProofPost[] = input.posts.map((post, index) => ({
    title: post.title?.trim() || excerptOf(post.content).slice(0, 80) || "LinkedIn post",
    excerpt: excerptOf(post.content),
    publishedAt: post.published_at,
    url: linkedInPostUrl(post.linkedin_post_id),
    metrics: input.metricsByPostIndex[index] ?? null,
  }))

  const measured = posts.filter((post) => post.metrics)
  const sum = (key: keyof ProofMetrics) => measured.reduce((total, post) => total + (post.metrics?.[key] ?? 0), 0)
  const engagement = (post: ProofPost) => post.metrics ? post.metrics.reactions + post.metrics.comments * 2 + post.metrics.reposts * 3 : -1
  const topPost = measured.length
    ? [...measured].sort((a, b) => engagement(b) - engagement(a) || (b.metrics?.impressions ?? 0) - (a.metrics?.impressions ?? 0))[0]
    : null

  const decided = input.approvals.filter((approval) => approval.decided_at && approval.status !== "pending")
  const hours = decided.map((approval) => (Date.parse(approval.decided_at as string) - Date.parse(approval.created_at)) / HOUR_MS).filter((value) => value >= 0)
  const medianHours = median(hours)
  const weekly = weeklyTargetStats(input.posts.map((post) => post.published_at), input.cadenceTarget, input.periodStart, input.periodEnd)

  return {
    version: 1,
    workspaceName: input.workspaceName,
    brandingColor: input.brandingColor,
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    generatedAt: generatedAt.toISOString(),
    cadenceTarget: input.cadenceTarget,
    weeksInPeriod: weekly.weeksInPeriod,
    weeksOnTarget: weekly.weeksOnTarget,
    streakWeeks: input.streakWeeks,
    totals: {
      postsPublished: posts.length,
      postsWithMetrics: measured.length,
      impressions: sum("impressions"),
      reactions: sum("reactions"),
      comments: sum("comments"),
      reposts: sum("reposts"),
    },
    approvals: {
      decided: decided.length,
      autoApproved: decided.filter((approval) => approval.auto_approved).length,
      medianHoursToDecision: medianHours === null ? null : Math.round(medianHours * 10) / 10,
    },
    topPost,
    posts: posts.slice(0, 30),
  }
}
