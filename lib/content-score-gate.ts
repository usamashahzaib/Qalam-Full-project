const SCORE_KEYS = ["hook", "readability", "authority", "specificity", "cta", "human", "voiceFit"] as const
export const MIN_READY_CONTENT_SCORE = 82

type ScoreKey = typeof SCORE_KEYS[number]
type Scores = Record<ScoreKey, number> & { overall: number; tips?: Record<string, string>; hashtags?: string[] }

const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)))

export const contentScoreCap = (content: string) => {
  const text = content.trim()
  // Length and line count cannot establish whether a thought is complete.
  // Only objective publishing constraints belong in this deterministic gate.
  if (!text) return { max: 0, reason: "Write a post before scoring." }
  if (text.length > 3000) return { max: 81, reason: "Shorten the post to LinkedIn's 3000 character limit." }

  return { max: 100, reason: "" }
}

// Retained for callers using the old signature. Retrying does not change quality.
export const freeTierAttemptCap = (attempt: number): number => { void attempt; return 100 }

export const isReadyContentScore = (score: unknown): score is number =>
  typeof score === "number" &&
  Number.isFinite(score) &&
  score >= MIN_READY_CONTENT_SCORE &&
  score <= 100

export const gateScores = <T extends Scores>(content: string, scores: T, extraCap?: number): T => {
  const { max: qualityMax, reason: qualityReason } = contentScoreCap(content)
  const max = typeof extraCap === "number" ? Math.min(qualityMax, extraCap) : qualityMax
  const reason = qualityReason
  const gated = { ...scores, overall: clamp(scores.overall, max) }
  for (const k of SCORE_KEYS) gated[k] = clamp(gated[k], max)
  if (reason) gated.tips = { ...(scores.tips ?? {}), overall: reason }
  return gated
}
