import type { WorkspaceProfile } from "@/components/providers/WorkspaceProvider"

export type ScoreCard = {
  label: string
  score: number
  note: string
}

export type ContentAnalysis = {
  overallScore: number
  overallLabel: string
  hookType: string
  scores: ScoreCard[]
  improvements: string[]
  hashtags: string[]
  excerpt: string
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "your", "have", "will", "into", "their", "they", "them",
  "what", "when", "where", "which", "about", "because", "there", "these", "those", "then", "than", "been", "being",
  "were", "while", "would", "could", "should", "after", "before", "under", "over", "between", "within", "again",
  "just", "like", "more", "most", "some", "many", "much", "very", "such", "also", "only", "each", "make", "made",
  "into", "onto", "yourself", "ourselves", "ours", "ours", "does", "doing", "done", "dont", "it's", "its", "you",
  "our", "we", "i", "me", "my", "mine", "us", "are", "was", "is", "be", "to", "of", "in", "on", "at", "a", "an",
])

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)))

const normalizeWord = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase()

const titleCaseTag = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join("")

const extractKeywords = (text: string) => {
  const counts = new Map<string, number>()
  for (const raw of text.split(/\s+/)) {
    const word = normalizeWord(raw)
    if (!word || word.length < 4 || STOPWORDS.has(word)) continue
    counts.set(word, (counts.get(word) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1]))
    .slice(0, 12)
    .map(([word]) => word)
}

export const buildHashtags = (text: string, profile?: Partial<WorkspaceProfile> | null) => {
  const tags = new Set<string>()
  for (const value of extractKeywords(text).slice(0, 5)) tags.add(`#${titleCaseTag(value)}`)
  for (const value of [profile?.industry, profile?.title]) {
    if (!value) continue
    tags.add(`#${titleCaseTag(value.replace(/[&/]+/g, " "))}`)
  }
  if (/linkedin/i.test(text)) tags.add("#LinkedIn")
  if (/team|manager|leadership|culture/i.test(text)) tags.add("#Leadership")
  if (/founder|startup|saas|growth/i.test(text)) tags.add("#Growth")
  return [...tags].filter((tag) => tag.length > 2).slice(0, 8)
}

export const analyzeContent = ({
  title,
  content,
  type,
  profile,
}: {
  title?: string
  content: string
  type?: string
  profile?: Partial<WorkspaceProfile> | null
}): ContentAnalysis => {
  const text = `${title || ""}\n${content}`.trim()
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean)
  const firstLine = lines[0] || title || ""
  const words = content.trim().split(/\s+/).filter(Boolean)
  const paragraphs = content.split(/\n\s*\n/).filter((chunk) => chunk.trim())
  const ctaRegex = /comment|reply|share|follow|save|dm|message|tell me|let me know|what do you think/i
  const hookRegex = /\?|^\d|hot take|stop|most people|nobody|why|how|mistake|truth|learned|failed|lesson/i
  const storyRegex = /\b(i|we)\s+(learned|realized|saw|noticed|failed|tested|built|spent|remember|used to)\b/i
  const authorityRegex = /\d+%|\d+x|\d+\b|years?|clients?|team|revenue|pipeline|hiring|operators?|leaders?/i
  const readability = clamp((words.length >= 80 && words.length <= 260 ? 35 : 18) + (paragraphs.length >= 3 ? 25 : 10) + (lines.length >= 5 ? 20 : 8) + (content.length <= 1800 ? 20 : 8))
  const hook = clamp((hookRegex.test(firstLine) ? 55 : 25) + (firstLine.length <= 90 ? 20 : 5) + (storyRegex.test(firstLine) ? 15 : 0) + (/\d/.test(firstLine) ? 10 : 0))
  const authority = clamp((authorityRegex.test(text) ? 55 : 25) + ((profile?.title || profile?.industry) ? 20 : 0) + (storyRegex.test(content) ? 15 : 0) + (words.length >= 120 ? 10 : 5))
  const cta = clamp((ctaRegex.test(content) ? 70 : 25) + (/[\?]$/.test(content.trim()) ? 15 : 0))
  const voiceFit = clamp((profile?.tone ? 25 : 10) + (profile?.industry ? 20 : 10) + (profile?.title ? 20 : 10) + (buildHashtags(text, profile).length >= 4 ? 10 : 4) + (storyRegex.test(content) ? 15 : 8) + (/linkedin/i.test(type || "") ? 10 : 6))
  const overall = clamp(hook * 0.24 + readability * 0.22 + authority * 0.2 + cta * 0.14 + voiceFit * 0.2)
  const improvements = [
    hook < 65 ? "Sharpen the hook: open with data, a question, or a bold claim." : "",
    readability < 65 ? "Improve readability: use short lines and at least 3 paragraph breaks." : "",
    authority < 65 ? "Add specific proof: a metric, team result, or concrete example." : "",
    cta < 60 ? "Add a clear next step: ask for a comment, a save, or share an opinion." : "",
    voiceFit < 70 ? "Complete your voice profile to align AI output with your positioning." : "",
  ].filter(Boolean).slice(0, 3)

  const hookNote = hookRegex.test(firstLine)
    ? (firstLine.length <= 90 ? "Strong opening — hook found in first line" : "Hook present but first line is too long (aim under 90 chars)")
    : "Weak opening — add a question, data point, or bold claim to the first line"

  const readabilityNote = words.length < 80
    ? "Too short — add more context or specifics"
    : words.length > 260
      ? "Too long — trim or split for better scroll-through"
      : paragraphs.length < 3
        ? "Add 3+ paragraph breaks — dense text loses mobile readers"
        : "Good length and structure for LinkedIn"

  const authorityNote = authorityRegex.test(text)
    ? "Concrete proof signals found — specific data or results present"
    : "No specific data detected — add a metric, result, or real example"

  const ctaNote = ctaRegex.test(content)
    ? "Clear engagement ask found"
    : /[?]$/.test(content.trim())
      ? "Ends with a question — good CTA signal"
      : "No call-to-action — end with a direct ask or question"

  const voiceFitNote = !profile?.tone && !profile?.industry && !profile?.title
    ? "Complete voice profile to improve alignment"
    : voiceFit >= 70
      ? "Well aligned with your saved profile"
      : "Partial profile — add tone, industry, or title for better alignment"

  return {
    overallScore: overall,
    overallLabel: overall >= 82 ? "Strong" : overall >= 68 ? "Solid" : overall >= 52 ? "Needs polish" : "Weak",
    hookType: hookRegex.test(firstLine) ? (/^\d/.test(firstLine) ? "Data-led" : /\?/.test(firstLine) ? "Question" : storyRegex.test(firstLine) ? "Story-led" : "Opinion-led") : "Plain",
    scores: [
      { label: "Hook", score: hook, note: hookNote },
      { label: "Readability", score: readability, note: readabilityNote },
      { label: "Authority", score: authority, note: authorityNote },
      { label: "CTA", score: cta, note: ctaNote },
      { label: "Voice fit", score: voiceFit, note: voiceFitNote },
    ],
    improvements,
    hashtags: buildHashtags(text, profile),
    excerpt: content.slice(0, 180),
  }
}
