// What can be measured about an author's writing is measured here, in code, from
// their saved example posts. The AI voice analysis returns a tone adjective and a
// few phrases. It never captured the things a reader notices first: that this
// person writes 60 words, not 300; that every post ends "That's the post."; that
// they spell it "organise". Live drafts missed all three, so they are now facts
// handed to the prompt and, where they are mechanical, applied to the output.

import type { VoiceMeasurements } from "@/lib/prompts/role-profiles"

const EM_DASH = String.fromCharCode(0x2014)
const POST_DIVIDER = new RegExp(`\\n[ \\t]*(?:-{3,}|\\*{3,}|${EM_DASH}{3,})[ \\t]*(?:\\n|$)`)
const MAX_CHUNK_CHARS = 600

// Splits raw example posts text into voice example chunks.
// LinkedIn posts are full of blank lines, so a blank line cannot mark the end
// of a post. Splitting on it stored each paragraph as its own "sample" and
// dropped short lines like a recurring sign-off, which are the most
// recognisable part of a voice. Dividers split posts. Without dividers,
// consecutive paragraphs are grouped so each sample keeps its rhythm.
export function chunkExamplePosts(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").trim()
  const posts = POST_DIVIDER.test(text) ? text.split(new RegExp(POST_DIVIDER.source, "g")) : null
  const chunks = posts ?? text.split(/\n[ \t]*\n/).reduce<string[]>((acc, paragraph) => {
    const last = acc.at(-1)
    if (last !== undefined && last.length + paragraph.length + 2 <= MAX_CHUNK_CHARS) acc[acc.length - 1] = `${last}\n\n${paragraph.trim()}`
    else acc.push(paragraph.trim())
    return acc
  }, [])
  return chunks
    .map((s) => s.trim())
    .filter((s) => s.length >= 30)
    .slice(0, 20)
}

const HASHTAG_LINE_RE = /^(?:#[\p{L}\p{N}_]+\s*)+$/u
const HASHTAG_RE = /(?:^|\s)#[\p{L}\p{N}_]+/u
const EMOJI_RE = /\p{Extended_Pictographic}/u
const BRITISH_RE = /\b(?:\w+(?:ise|ised|ising|isation|yse|ysed)|colour\w*|favour\w*|behaviour\w*|labour\w*|honour\w*|centre\w*|programme\w*|learnt|spelt|whilst|cheque|defence|licence|travelled|cancelled|modelling|organisation\w*)\b/gi
const AMERICAN_RE = /\b(?:\w+(?:ize|ized|izing|ization|yze|yzed)|color\w*|favor\w*|behavior\w*|labor\w*|honor\w*|center\w*|program(?:s|med|ming)?|traveled|canceled|modeling|organization\w*)\b/gi
// Words that end in -ise/-ize in both spellings and prove nothing.
const NEUTRAL_RE = /^(?:size|sized|prize|prized|seize|seized|rise|risen|arise|raise|raised|raising|praise|praised|wise|otherwise|likewise|noise|poise|advise|advised|advertise|advertised|advertising|compromise|compromised|enterprise|exercise|exercised|expertise|franchise|premise|promise|promised|surprise|surprised|televise|revise|revised|supervise|supervised|improvise|devise|comprise|despise|disguise|merchandise|precise|concise|citizen|dozen|frozen|horizon|bronze|analyses)$/i

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

const lines = (post: string) => post.split("\n").map((l) => l.trim()).filter(Boolean)
const bodyLines = (post: string) => lines(post).filter((l) => !HASHTAG_LINE_RE.test(l))
const wordCount = (post: string) => bodyLines(post).join(" ").split(/\s+/).filter(Boolean).length
const normalizeLine = (line: string) => line.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, "").trim()

const countMatches = (text: string, re: RegExp) =>
  (text.match(re) ?? []).filter((word) => !NEUTRAL_RE.test(word)).length

const usage = (share: number): VoiceMeasurements["hashtags"] => share === 0 ? "never" : share >= 0.6 ? "usually" : "sometimes"

/** Measures an author's example posts. Needs at least two posts to say anything. */
export function measureVoice(rawExamplePosts?: string | null): VoiceMeasurements | undefined {
  const posts = rawExamplePosts ? chunkExamplePosts(rawExamplePosts) : []
  if (posts.length < 2) return undefined

  const lastLines = posts.map((post) => bodyLines(post).at(-1) ?? "")
  const lastLineCounts = new Map<string, { line: string; count: number }>()
  for (const line of lastLines) {
    const key = normalizeLine(line)
    if (!key || key.split(" ").length > 8) continue
    const entry = lastLineCounts.get(key) ?? { line, count: 0 }
    lastLineCounts.set(key, { line: entry.line, count: entry.count + 1 })
  }
  const topSignOff = [...lastLineCounts.values()].sort((a, b) => b.count - a.count)[0]
  const signOff = topSignOff && topSignOff.count >= 2 && topSignOff.count / posts.length >= 0.5 ? topSignOff.line : undefined

  const allText = posts.join("\n")
  const british = countMatches(allText, BRITISH_RE)
  const american = countMatches(allText, AMERICAN_RE)
  const spelling = british >= 2 && american === 0 ? "British" : american >= 2 && british === 0 ? "American" : undefined

  const share = (test: (post: string) => boolean) => posts.filter(test).length / posts.length

  return {
    postCount: posts.length,
    wordsPerPost: median(posts.map(wordCount)),
    signOff,
    spelling,
    hashtags: usage(share((post) => HASHTAG_RE.test(post))),
    emoji: usage(share((post) => EMOJI_RE.test(post))),
    closesWithQuestion: usage(share((post) => /\?\s*$/.test(bodyLines(post).at(-1) ?? ""))),
    blankLineParagraphs: share((post) => /\n[ \t]*\n/.test(post.trim())) >= 0.75,
  }
}

/**
 * Words for a post of this format, anchored to how long this author actually writes.
 * The format still means something: short is shorter than their norm, long is longer.
 */
export function wordTargetFor(format: "short" | "medium" | "long", measured?: VoiceMeasurements): { min: number; max: number } | undefined {
  if (!measured?.wordsPerPost) return undefined
  const scale = { short: 0.75, medium: 1, long: 1.5 }[format]
  const centre = Math.min(500, Math.max(40, Math.round(measured.wordsPerPost * scale)))
  return { min: Math.max(30, Math.round(centre * 0.75)), max: Math.round(centre * 1.25) }
}

/**
 * The mechanical parts of a voice, applied after generation because models skip
 * them: a sign-off the author uses on every post, and no hashtags for an author
 * who never uses them.
 */
export function applyVoiceMechanics(post: string, measured?: VoiceMeasurements): string {
  if (!measured) return post
  let result = post.trim()
  // Space out a post that came back as one run of lines, but keep a list's items together.
  if (measured.blankLineParagraphs && !/\n[ \t]*\n/.test(result)) {
    const isListItem = (line: string) => /^\s*(?:\d+[.)]|[-*•])\s/.test(line)
    result = result.split("\n").reduce((acc, line, i, all) => {
      if (i === 0) return line
      return acc + (isListItem(line) && isListItem(all[i - 1]) ? "\n" : "\n\n") + line
    }, "")
  }
  if (measured.hashtags === "never") {
    result = lines(result).length > 1
      ? result.split("\n").filter((line) => !HASHTAG_LINE_RE.test(line.trim())).join("\n").trim()
      : result
  }
  if (measured.signOff && !normalizeLine(result).endsWith(normalizeLine(measured.signOff))) {
    const all = result.split("\n")
    const tagStart = all.findIndex((line, i) => i > 0 && HASHTAG_LINE_RE.test(line.trim()) && all.slice(i).every((l) => !l.trim() || HASHTAG_LINE_RE.test(l.trim())))
    const body = (tagStart === -1 ? all : all.slice(0, tagStart)).join("\n").trim()
    const tags = tagStart === -1 ? "" : all.slice(tagStart).join("\n").trim()
    result = [body, measured.signOff, tags].filter(Boolean).join("\n\n")
  }
  return result
}
