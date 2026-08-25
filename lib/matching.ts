// Domain-agnostic peer matching engine.
//
// Pure functions only: no database, no network, no server imports. The engine
// takes normalised participants and returns ranked matches with human readable
// reasons. Scoring rules are supplied per domain, so adding a second match
// domain means adding a rule set here, not forking the pipeline.
//
// Deliberately not embedding based. pgvector is conditional in this project
// (see the production baseline migration) and an explainable overlap score
// produces the "why this person" copy the UI needs anyway.

export type MatchAttributes = {
  industry: string
  seniority: string
  location: string
  expertise: string[]
  audience: string[]
  goals: string[]
}

export type MatchParticipant = {
  userId: string
  workspaceId: string
  displayName: string
  headline: string
  attributes: MatchAttributes
}

export type MatchResult = {
  participant: MatchParticipant
  score: number
  reasons: string[]
}

export const MIN_MATCH_SCORE = 30
export const MATCHES_PER_PERIOD = 3

const SENIORITY_LADDER = [
  ["student", "intern", "trainee"],
  ["junior", "associate", "entry"],
  ["mid", "executive", "officer", "specialist"],
  ["senior", "lead", "principal", "manager"],
  ["head", "director", "partner"],
  ["vp", "vice president", "chief", "cto", "ceo", "cfo", "founder", "co-founder"],
]

const normalise = (value: string) => value.trim().toLocaleLowerCase()

const normaliseList = (values: string[]) => {
  const seen = new Set<string>()
  for (const value of values) {
    const cleaned = normalise(value)
    if (cleaned) seen.add(cleaned)
  }
  return seen
}

export const seniorityRank = (value: string) => {
  const cleaned = normalise(value)
  if (!cleaned) return -1
  for (let index = SENIORITY_LADDER.length - 1; index >= 0; index -= 1) {
    if (SENIORITY_LADDER[index].some((token) => cleaned.includes(token))) return index
  }
  return -1
}

const intersect = (left: Set<string>, right: Set<string>) =>
  [...left].filter((value) => right.has(value))

const jaccard = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0
  const shared = intersect(left, right).length
  return shared / (left.size + right.size - shared)
}

const title = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1)

const listPhrase = (values: string[], limit = 2) => {
  const shown = values.slice(0, limit).map(title)
  if (shown.length <= 1) return shown[0] ?? ""
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`
}

/**
 * Scores a single directed pair. Direction matters: the strongest professional
 * signal is "their expertise is the audience you write for", which is not
 * symmetric, so viewer and candidate are never interchangeable here.
 */
export function scorePair(viewer: MatchParticipant, candidate: MatchParticipant): Omit<MatchResult, "participant"> {
  const reasons: string[] = []
  let score = 0

  const viewerExpertise = normaliseList(viewer.attributes.expertise)
  const viewerAudience = normaliseList(viewer.attributes.audience)
  const viewerGoals = normaliseList(viewer.attributes.goals)
  const candidateExpertise = normaliseList(candidate.attributes.expertise)
  const candidateAudience = normaliseList(candidate.attributes.audience)
  const candidateGoals = normaliseList(candidate.attributes.goals)

  const reach = intersect(candidateExpertise, viewerAudience)
  if (reach.length) {
    score += Math.min(30, reach.length * 15)
    reasons.push(`They work in ${listPhrase(reach)}, which is exactly the audience you write for.`)
  }

  const reverseReach = intersect(viewerExpertise, candidateAudience)
  if (reverseReach.length) {
    score += Math.min(20, reverseReach.length * 10)
    reasons.push(`Your ${listPhrase(reverseReach)} work is the audience they are trying to reach.`)
  }

  const industry = normalise(viewer.attributes.industry)
  const sameIndustry = Boolean(industry) && industry === normalise(candidate.attributes.industry)
  if (sameIndustry) {
    score += 18
    reasons.push(`Both of you are building in ${title(industry)}.`)
  }

  const expertiseOverlap = jaccard(viewerExpertise, candidateExpertise)

  // Same field, different specialism is the useful pairing. Same field, same
  // specialism means you are competing for identical attention, so it is penalised.
  if (sameIndustry && expertiseOverlap > 0 && expertiseOverlap < 0.34) {
    score += 12
    reasons.push("Same field, different specialism, so neither of you is chasing the same attention.")
  }
  if (expertiseOverlap > 0.7) score -= 15

  const sharedGoals = intersect(viewerGoals, candidateGoals)
  if (sharedGoals.length) {
    score += 10
    reasons.push(`You are both working toward ${listPhrase(sharedGoals, 1)}.`)
  }

  const location = normalise(viewer.attributes.location)
  if (location && location === normalise(candidate.attributes.location)) {
    score += 8
    reasons.push(`Both based in ${title(location)}.`)
  }

  const viewerRank = seniorityRank(viewer.attributes.seniority)
  const candidateRank = seniorityRank(candidate.attributes.seniority)
  if (viewerRank >= 0 && candidateRank >= 0) {
    const distance = Math.abs(viewerRank - candidateRank)
    if (distance <= 1) score += 8
    else if (distance >= 3) score -= 10
  }

  return { score: Math.max(0, Math.min(100, score)), reasons: reasons.slice(0, 3) }
}

export type SelectOptions = {
  exclude?: Iterable<string>
  limit?: number
  minScore?: number
  /**
   * Hard eligibility gate, applied before scoring. Professional matching has no
   * disqualifiers: a weak pairing simply scores low. Other domains have absolute
   * constraints that must never be traded off against a high score, and those
   * belong here rather than as a large negative weight.
   */
  disqualify?: (viewer: MatchParticipant, candidate: MatchParticipant) => boolean
}

/**
 * Ranks a candidate pool for one viewer. Ties break on userId so the same pool
 * always produces the same suggestions for a given period.
 */
export function selectMatches(
  viewer: MatchParticipant,
  pool: MatchParticipant[],
  options: SelectOptions = {},
): MatchResult[] {
  const excluded = new Set(options.exclude ?? [])
  excluded.add(viewer.userId)
  const limit = options.limit ?? MATCHES_PER_PERIOD
  const minScore = options.minScore ?? MIN_MATCH_SCORE

  return pool
    .filter((candidate) => !excluded.has(candidate.userId))
    .filter((candidate) => !options.disqualify?.(viewer, candidate))
    .map((candidate) => ({ participant: candidate, ...scorePair(viewer, candidate) }))
    .filter((match) => match.score >= minScore && match.reasons.length > 0)
    .sort((first, second) => second.score - first.score || first.participant.userId.localeCompare(second.participant.userId))
    .slice(0, limit)
}

/** Monday of the UTC week containing `value`, as an ISO date key. */
export function periodStart(value: Date = new Date()) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  const dayOffset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayOffset)
  return date.toISOString().slice(0, 10)
}

/** Canonical ordering for a connection pair so a mutual match stores one row. */
export function connectionPair(first: string, second: string) {
  return first < second ? { userA: first, userB: second } : { userA: second, userB: first }
}
