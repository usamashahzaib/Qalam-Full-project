const SCORE_KEYS = ["hook", "readability", "authority", "specificity", "cta", "human", "voiceFit"] as const
// Calibrated to the scorer, not to how strict a number sounds. The rubric calls an ordinary
// competent post 55-70 and 90 rare. At 82 the gate blocked the author's own real posts
// (scored 69-77 across runs) while a draft could clear it by luck (81, 84, 81 for the same
// text). Invented claims are what actually separate a bad draft, and those are capped and
// listed separately (see capUnsupported), so the number only has to rule out weak writing.
export const MIN_READY_CONTENT_SCORE = 65
/** Shown as "Strong" in the writer and counted as strong in analytics. */
export const STRONG_CONTENT_SCORE = 85
/** What Push to 90+ aims for. */
export const TARGET_CONTENT_SCORE = 90

type ScoreKey = typeof SCORE_KEYS[number]
type Scores = Record<ScoreKey, number> & { overall: number; tips?: Record<string, string>; hashtags?: string[] }

const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)))

export const contentScoreCap = (content: string) => {
  const text = content.trim()
  // Length and line count cannot establish whether a thought is complete.
  // Only objective publishing constraints belong in this deterministic gate.
  if (!text) return { max: 0, reason: "Write a post before scoring." }
  if (text.length > 3000) return { max: MIN_READY_CONTENT_SCORE - 1, reason: "Shorten the post to LinkedIn's 3000 character limit." }

  return { max: 100, reason: "" }
}

// Retained for callers using the old signature. Retrying does not change quality.
export const freeTierAttemptCap = (attempt: number): number => { void attempt; return 100 }

export const isReadyContentScore = (score: unknown): score is number =>
  typeof score === "number" &&
  Number.isFinite(score) &&
  score >= MIN_READY_CONTENT_SCORE &&
  score <= 100

const normalizeForMatch = (text: string) =>
  text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”"]/g, "").replace(/[^\p{L}\p{N}%$£€' ]+/gu, " ").replace(/\s+/g, " ").trim()

// The scorer lists the claims it thinks were invented. A quote only counts when it is
// actually in the post, so a hallucinated flag cannot sink a clean draft.
export const verifiedUnsupportedClaims = (content: string, claims: unknown): string[] => {
  if (!Array.isArray(claims)) return []
  const post = normalizeForMatch(content)
  const postWords = new Set(post.split(" "))
  return claims
    .filter((claim): claim is string => typeof claim === "string" && claim.trim().length >= 8)
    .map((claim) => claim.trim().slice(0, 300))
    // A question asserts nothing, so it cannot be an invented fact. The CTA score handles it.
    .filter((claim) => !claim.endsWith("?"))
    .filter((claim) => {
      const quote = normalizeForMatch(claim)
      if (post.includes(quote)) return true
      const words = quote.split(" ").filter((word) => word.length > 3)
      return words.length >= 3 && words.filter((word) => postWords.has(word)).length / words.length >= 0.8
    })
    .slice(0, 5)
}

// The model does not reliably hold itself to a cap, so the cap for invented detail is
// applied here from the verified list instead of being left to the prompt.
export const UNSUPPORTED_CAPS = { specificity: 40, human: 50 } as const
export const capUnsupported = <T extends Partial<Record<ScoreKey, number>>>(scores: T, unsupported: string[]): T =>
  unsupported.length
    ? {
        ...scores,
        specificity: Math.min(Number(scores.specificity) || 0, UNSUPPORTED_CAPS.specificity),
        human: Math.min(Number(scores.human) || 0, UNSUPPORTED_CAPS.human),
      }
    : scores

// Tips feed Push to 90+, which has nothing but the post and the brief. A tip to add a
// statistic or a story can only be followed by inventing one, and a tip to end on a
// question is the engagement bait the rubric marks down. Both get dropped.
const ADDS_A_FACT = /\b(add|include|insert|reference|provide|cite|mention|note|share|back)\b[^.]*\b(metrics?|statistics?|stats?|numbers?|figures?|data|examples?|anecdotes?|story|stories|case stud(y|ies)|stud(y|ies)|sources?|frameworks?|benchmarks?|research|personal|experience|reflection|role)\b/i
const ADDS_A_QUESTION = /\b(add|end|close|pose|include|finish|conclude|ask)\b[^.]*\b(questions?|invit\w*|share|comments?)\b/i
const REMOVES_SOMETHING = /\b(remove|cut|delete|drop|replace|instead of|rather than|without adding|not a|line breaks?|blank lines?|spacing)\b/i

export const sanitizeTips = (tips: Record<string, string> | undefined): Record<string, string> =>
  Object.fromEntries(Object.entries(tips ?? {}).map(([key, tip]) => {
    const text = typeof tip === "string" ? tip : ""
    const breaksRubric = !REMOVES_SOMETHING.test(text) && (ADDS_A_FACT.test(text) || ADDS_A_QUESTION.test(text))
    return [key, breaksRubric ? "Leave as is." : text]
  }))

export const gateScores = <T extends Scores>(content: string, scores: T, extraCap?: number): T => {
  const { max: qualityMax, reason: qualityReason } = contentScoreCap(content)
  const max = typeof extraCap === "number" ? Math.min(qualityMax, extraCap) : qualityMax
  const reason = qualityReason
  const gated = { ...scores, overall: clamp(scores.overall, max), tips: sanitizeTips(scores.tips) }
  for (const k of SCORE_KEYS) gated[k] = clamp(gated[k], max)
  if (reason) gated.tips = { ...gated.tips, overall: reason }
  return gated
}
