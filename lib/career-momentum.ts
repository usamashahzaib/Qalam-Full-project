export type MomentumActivity = {
  at: string
}

export type MomentumInputs = {
  signalCount: number
  evidenceCount: number
  documentedEvidenceCount: number
  profileCompletion: number
  publishedPostsLast30Days: number
  activeApplications: number
  interviews: number
  activeDaysLast7: number
}

export type MomentumBreakdown = {
  proof: number
  profile: number
  visibility: number
  pipeline: number
  consistency: number
}

export type CareerMomentumView = {
  today: string
  prompt: { key: string; copy: string }
  proofCapturedToday: boolean
  activeToday: boolean
  currentStreak: number
  activeDaysLast7: number
  week: Array<{ date: string; active: boolean }>
  score: number
  breakdown: MomentumBreakdown
  counts: {
    signals: number
    evidence: number
    documentedEvidence: number
    publishedPostsLast30Days: number
    activeApplications: number
  }
  recentSignals: Array<{ id: string; note: string; date: string }>
  nextAction: { label: string; href: string; reason: string }
  reminder: {
    enabled: boolean
    hour: number
  }
  measurementNote: string
}

export const clampTimezoneOffset = (value: number) =>
  Math.max(-840, Math.min(840, Math.trunc(value)))

export const toLocalDateKey = (value: string | Date, timezoneOffset: number) => {
  const date = value instanceof Date ? value : new Date(value)
  const shifted = new Date(date.getTime() - clampTimezoneOffset(timezoneOffset) * 60_000)
  return shifted.toISOString().slice(0, 10)
}

export const localDateKeys = (days: number, timezoneOffset: number, now = new Date()) => {
  const today = toLocalDateKey(now, timezoneOffset)
  const cursor = new Date(`${today}T00:00:00.000Z`)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(cursor)
    date.setUTCDate(cursor.getUTCDate() - index)
    return date.toISOString().slice(0, 10)
  })
}

export const calculateCurrentStreak = (
  activeDateKeys: Iterable<string>,
  timezoneOffset: number,
  now = new Date()
) => {
  const active = new Set(activeDateKeys)
  const dates = localDateKeys(366, timezoneOffset, now)
  const startIndex = active.has(dates[0]) ? 0 : 1
  let streak = 0

  for (let index = startIndex; index < dates.length; index += 1) {
    if (!active.has(dates[index])) break
    streak += 1
  }

  return streak
}

export const calculateMomentumScore = (inputs: MomentumInputs) => {
  const proof = Math.min(
    35,
    Math.min(20, inputs.signalCount * 2) +
      Math.min(10, inputs.evidenceCount * 2) +
      Math.min(5, inputs.documentedEvidenceCount * 2.5)
  )
  const profile = Math.min(15, Math.round(inputs.profileCompletion * 0.15))
  const visibility = Math.min(25, inputs.publishedPostsLast30Days * 8)
  const pipeline = Math.min(15, inputs.activeApplications * 3 + inputs.interviews * 6)
  const consistency = Math.min(10, inputs.activeDaysLast7 * 2)

  const breakdown: MomentumBreakdown = {
    proof: Math.round(proof),
    profile,
    visibility,
    pipeline,
    consistency,
  }

  return {
    score: Math.min(100, Object.values(breakdown).reduce((total, value) => total + value, 0)),
    breakdown,
  }
}

export const calculateProfileCompletion = (profile: Record<string, unknown> | null) => {
  if (!profile) return 0
  const checks = [
    Boolean(profile.target_role),
    Boolean(profile.target_industry),
    Boolean(profile.summary),
    Array.isArray(profile.skills) && profile.skills.length >= 3,
    Array.isArray(profile.achievements) && profile.achievements.length >= 1,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
