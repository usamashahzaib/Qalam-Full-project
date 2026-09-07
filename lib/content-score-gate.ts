const SCORE_KEYS = ["hook", "readability", "authority", "specificity", "cta", "human", "voiceFit"] as const
export const MIN_READY_CONTENT_SCORE = 82

type ScoreKey = typeof SCORE_KEYS[number]
type Scores = Record<ScoreKey, number> & { overall: number; tips?: Record<string, string>; hashtags?: string[] }

const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)))

export const contentScoreCap = (content: string) => {
  const text = content.trim()
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean).length
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length

  if (words < 20) return { max: 35, reason: "Write the actual post before scoring." }
  if (words < 50) return { max: 55, reason: "Add substance: aim for at least 80 words." }
  if (words < 80) return { max: 68, reason: "Draft is still thin. Add context, example, and payoff." }
  if (lines < 4) return { max: 76, reason: "Break the draft into scannable LinkedIn lines." }
  if (paragraphs < 2) return { max: 82, reason: "Add whitespace between ideas for mobile readability." }

  return { max: 100, reason: "" }
}

// Retained for callers using the old signature. Retrying does not change quality.
export const freeTierAttemptCap = (_attempt: number): number => 100

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
