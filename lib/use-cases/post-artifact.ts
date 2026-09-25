import { sanitizeGeneratedText } from "@/lib/content-guard"

export type PostArtifact = { content: string; wordCount: number }

const SCORE_KEYS = [
  "hook",
  "readability",
  "authority",
  "specificity",
  "cta",
  "human",
  "voiceFit",
  "overall",
  "tips",
  "hashtags",
]

const looksLikeJson = (value: string) => /^[\s\r\n]*[{[]/.test(value)

const looksLikeScorePayload = (value: string) => {
  if (!looksLikeJson(value)) return false
  try {
    const parsed = JSON.parse(value.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()) as unknown
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return false
    const keys = Object.keys(parsed as Record<string, unknown>)
    return keys.filter((k) => SCORE_KEYS.includes(k)).length >= 3
  } catch {
    return SCORE_KEYS.filter((k) => new RegExp(`"${k}"\\s*:`, "i").test(value)).length >= 3
  }
}

// 80 words and 4 lines catches a truncated or half-empty generation. An author whose own
// posts run 45 words gets a floor scaled to them instead, or every draft in their voice fails.
export const toPostArtifact = (raw: string, options: { minWords?: number } = {}): PostArtifact | null => {
  const minWords = Math.max(20, Math.min(80, options.minWords ?? 80))
  const content = sanitizeGeneratedText(raw)
  if (!content || looksLikeJson(content) || looksLikeScorePayload(content)) return null

  const words = content.split(/\s+/).filter(Boolean)
  const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (words.length < minWords || lines.length < (minWords < 80 ? 2 : 4)) return null

  return { content, wordCount: words.length }
}
