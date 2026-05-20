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
    hook < 65 ? "Hook ko sharper karo: first line me data, question, ya bold claim lao." : "",
    readability < 65 ? "Readability improve karo: short lines aur 3-5 scan breaks rakho." : "",
    authority < 65 ? "Specific proof add karo: metric, team signal, ya real example." : "",
    cta < 60 ? "End me clear next step do: comment, save, ya opinion ask." : "",
    voiceFit < 70 ? "Voice profile fields fill karo ta ke output tumhari positioning se align ho." : "",
  ].filter(Boolean).slice(0, 3)

  return {
    overallScore: overall,
    overallLabel: overall >= 82 ? "Strong" : overall >= 68 ? "Solid" : overall >= 52 ? "Needs polish" : "Weak",
    hookType: hookRegex.test(firstLine) ? (/^\d/.test(firstLine) ? "Data-led" : /\?/.test(firstLine) ? "Question" : storyRegex.test(firstLine) ? "Story-led" : "Opinion-led") : "Plain",
    scores: [
      { label: "Hook", score: hook, note: "First line stopping power" },
      { label: "Readability", score: readability, note: "Scan-friendly mobile structure" },
      { label: "Authority", score: authority, note: "Specificity and proof" },
      { label: "CTA", score: cta, note: "Clear engagement ask" },
      { label: "Voice fit", score: voiceFit, note: "Alignment with saved profile" },
    ],
    improvements,
    hashtags: buildHashtags(text, profile),
    excerpt: content.slice(0, 180),
  }
}
