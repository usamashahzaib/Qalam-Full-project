/**
 * Deterministic clean up applied to resume data before it is scored, stored,
 * or exported.
 *
 * A model writes good sentences but is inconsistent about the mechanical
 * details an applicant tracking system is strict about: date format, bullet
 * punctuation, pronouns, duplicate skills, stray glyphs. Fixing those in code
 * rather than in a prompt means they are fixed every time, on every surface,
 * including resumes a user typed by hand.
 *
 * Nothing here invents content. It only reshapes what is already present, so
 * a normalized resume makes exactly the same factual claims as the original.
 */

import type { ResumeData } from "@/lib/career-resume"
import { formatResumeDate, parseResumeDate } from "@/lib/ats-engine"

/** Glyphs that look fine on screen and corrupt a parse. */
const STRIP_GLYPHS =
  /[\u2028\u2029\uFFFD\u200B-\u200F\u202A-\u202E]|[\u{1F300}-\u{1FAFF}]|[\u2190-\u21FF]|[\u2500-\u257F]|[\u25A0-\u25FF]|[\u2022\u25CF\u25AA\u2023\u2043]/gu

/** Leading list markers the model sometimes leaves on a bullet string. */
const LEADING_MARKER = /^\s*([-*•●▪‣⁃>]|\d+[.)])\s+/

const PRONOUN_OPENERS = [
  /^i\s+(?:have\s+|had\s+|was\s+|am\s+|then\s+)?/i,
  /^(?:my|our)\s+(?:role|job|responsibilities|duties)\s+(?:was|were|included)\s+(?:to\s+)?/i,
  /^we\s+/i,
]

const DUTY_OPENERS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /^(?:was\s+)?responsible for\s+/i, replacement: "" },
  { pattern: /^duties includ(?:ed|e)\s*:?\s*/i, replacement: "" },
  { pattern: /^tasked with\s+/i, replacement: "" },
  { pattern: /^in charge of\s+/i, replacement: "" },
  { pattern: /^(?:was\s+)?involved in\s+/i, replacement: "" },
  { pattern: /^participated in\s+/i, replacement: "" },
]

const collapse = (value: string) =>
  (value || "").replace(STRIP_GLYPHS, " ").replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim()

const capitalise = (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : value)

/**
 * A bullet has to open with a verb and carry no trailing full stop, because
 * both are read as noise by a parser and as sloppiness by a recruiter.
 */
export function normalizeBullet(raw: string): string {
  let value = collapse(raw).replace(LEADING_MARKER, "")
  for (const opener of PRONOUN_OPENERS) value = value.replace(opener, "")
  for (const duty of DUTY_OPENERS) value = value.replace(duty.pattern, duty.replacement)
  value = value.replace(/\s*[.;,]+\s*$/, "")
  return capitalise(value.trim())
}

const normalizeEntry = (entry: ResumeData["experience"][number]) => ({
  ...entry,
  title: collapse(entry.title),
  organization: collapse(entry.organization),
  location: collapse(entry.location),
  startDate: formatResumeDate(entry.startDate),
  endDate: formatResumeDate(entry.endDate),
  bullets: dedupe(entry.bullets.map(normalizeBullet).filter((bullet) => bullet.length > 3)),
})

const dedupe = (values: string[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const monthIndex = (value: string) => {
  const parsed = parseResumeDate(value)
  return parsed ? parsed.year * 12 + parsed.month : -1
}

/**
 * Reverse chronological order is not a style preference. Parsers treat the
 * first entry as the current role, and a resume that leads with an old job
 * gets screened at the wrong seniority.
 */
const sortNewestFirst = (entries: ResumeData["experience"]) =>
  [...entries].sort((a, b) => {
    const left = Math.max(monthIndex(a.endDate), monthIndex(a.startDate))
    const right = Math.max(monthIndex(b.endDate), monthIndex(b.startDate))
    if (left === right) return 0
    if (left < 0) return 1
    if (right < 0) return -1
    return right - left
  })

export function normalizeResumeData(data: ResumeData): ResumeData {
  const linkedin = collapse(data.linkedinUrl).replace(/^https?:\/\//i, "").replace(/\/$/, "")

  return {
    ...data,
    fullName: collapse(data.fullName),
    email: collapse(data.email).toLowerCase(),
    phone: collapse(data.phone),
    location: collapse(data.location),
    linkedinUrl: linkedin,
    headline: collapse(data.headline).replace(/\s*[.]+\s*$/, ""),
    summary: collapse(data.summary),
    skills: dedupe(data.skills.map(collapse).filter((skill) => skill.length > 1)).slice(0, 24),
    experience: sortNewestFirst(data.experience.map(normalizeEntry)),
    education: sortNewestFirst(data.education.map(normalizeEntry)),
    projects: data.projects.map(normalizeEntry),
    certifications: dedupe(data.certifications.map(collapse).filter(Boolean)),
  }
}
