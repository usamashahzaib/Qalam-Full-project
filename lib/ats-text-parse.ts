/**
 * Best effort structural parse of pasted or uploaded resume text.
 *
 * The free checker only ever receives flat text, so without this the
 * deterministic engine could not run there and the public score would still
 * be a model's guess. Parsing the text into the same shape the studio uses
 * means one scoring engine serves both surfaces and a candidate gets the same
 * number from the free tool and from the paid builder.
 *
 * This is deliberately conservative. When a section cannot be identified with
 * confidence it is left empty rather than guessed, because a wrong guess
 * would move the score without the candidate being able to see why.
 */

import type { ResumeData } from "@/lib/career-resume"
import { emptyResumeData } from "@/lib/career-resume"
import { parseResumeDate } from "@/lib/ats-engine"

type SectionKey = "summary" | "skills" | "experience" | "education" | "certifications" | "projects"

const SECTION_HEADINGS: { key: SectionKey; pattern: RegExp }[] = [
  { key: "summary", pattern: /^(professional\s+)?(summary|profile|objective|about\s+me|career\s+summary|executive\s+summary)\b/i },
  { key: "skills", pattern: /^(core\s+|technical\s+|key\s+)?(skills|competencies|competences|expertise|technologies|tools)\b/i },
  { key: "experience", pattern: /^(work\s+|professional\s+|employment\s+|relevant\s+)?(experience|history|employment|background)\b/i },
  { key: "education", pattern: /^(education|academic|qualifications?|academics)\b/i },
  { key: "certifications", pattern: /^(certifications?|licen[cs]es?|courses|training|accreditations?)\b/i },
  { key: "projects", pattern: /^(projects?|selected\s+projects?|portfolio)\b/i },
]

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/
const LINKEDIN = /((?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[^\s,|]+)/i
const BULLET_MARKER = /^\s*([-*•●▪‣⁃>]|\d+[.)])\s+/

// PDF and LinkedIn exports sometimes flatten visual rows into one line. Split
// only known section labels and list markers back into lines before parsing.
// This is deliberately narrow so normal prose is never treated as a heading.
const INLINE_SECTION_HEADING = /\s+((?:PROFESSIONAL\s+)?SUMMARY|PROFILE|OBJECTIVE|CAREER\s+SUMMARY|EXECUTIVE\s+SUMMARY|(?:CORE\s+|TECHNICAL\s+|KEY\s+)?(?:SKILLS|COMPETENCIES|COMPETENCES|EXPERTISE|TECHNOLOGIES|TOOLS)|(?:WORK\s+|PROFESSIONAL\s+|EMPLOYMENT\s+|RELEVANT\s+)?(?:EXPERIENCE|HISTORY|EMPLOYMENT|BACKGROUND)|EDUCATION|ACADEMIC|QUALIFICATIONS?|ACADEMICS|CERTIFICATIONS?|LICEN[CS]ES?|COURSES|TRAINING|ACCREDITATIONS?|PROJECTS?|SELECTED\s+PROJECTS?|PORTFOLIO)\s+/g

/**
 * A date range on its own or trailing a role line, for example
 * "Mar 2021 - Present" or "2018 to 2021".
 */
const DATE_RANGE =
  /((?:[a-z]{3,9}\.?\s+)?(?:19|20)\d{2})\s*(?:-|to|until|through|\u2013|\u2014)\s*((?:[a-z]{3,9}\.?\s+)?(?:19|20)\d{2}|present|current|now|ongoing)/i

const clean = (value: string) => value.replace(/\s+/g, " ").trim()

/** A heading line is short, has no sentence punctuation, and matches a name. */
const headingKey = (line: string): SectionKey | null => {
  const text = clean(line).replace(/[:|]+$/, "")
  if (!text || text.length > 42 || /[.!?]/.test(text)) return null
  const match = SECTION_HEADINGS.find((section) => section.pattern.test(text))
  return match ? match.key : null
}

const isBullet = (line: string) => BULLET_MARKER.test(line)

/**
 * A role header carries a date range, or reads as a short title line that is
 * followed by bullets. Only the first form is trusted, because the second is
 * indistinguishable from a stray sentence often enough to corrupt the parse.
 */
const splitRoleHeader = (line: string) => {
  const text = clean(line)
  const range = text.match(DATE_RANGE)
  if (!range) return null
  const head = clean(text.slice(0, range.index).replace(/[|,\-\u2013\u2014]+$/, ""))
  const trailing = clean(text.slice((range.index || 0) + range[0].length).replace(/^[|,\-\u2013\u2014\s]+/, ""))
  // "Senior Analyst at Acme", "Senior Analyst | Acme", "Senior Analyst, Acme"
  const pipeParts = head.split(/\s*[|]\s*/).map(clean).filter(Boolean)
  const parts = (pipeParts.length > 1 ? pipeParts : head.split(/\s+(?:at|@)\s+|\s*,\s*/)).map(clean).filter(Boolean)
  const trailingParts = trailing.split(/\s*[|,]\s*/).map(clean).filter(Boolean)
  return {
    title: parts[0] || "",
    organization: parts[1] || trailingParts[0] || "",
    location: parts[2] || trailingParts.slice(1).join(", ") || "",
    startDate: clean(range[1]),
    endDate: clean(range[2]),
  }
}

const splitSkills = (lines: string[]) =>
  lines
    .flatMap((line) => clean(line).replace(BULLET_MARKER, "").split(/[,;|•·]|\s{3,}/))
    .map(clean)
    .filter((skill) => skill.length > 1 && skill.length < 60)

export function parseResumeText(rawText: string): ResumeData {
  const structuredText = (rawText || "")
    .replace(INLINE_SECTION_HEADING, "\n$1\n")
    .replace(/\s+(?=[•●▪‣⁃]\s+)/g, "\n")
  const lines = structuredText.split(/\r?\n/).map((line) => line.replace(/\t/g, " "))
  const nonEmpty = lines.filter((line) => line.trim())

  const emailMatch = rawText.match(EMAIL)
  const phoneMatch = rawText.match(PHONE)
  const linkedinMatch = rawText.match(LINKEDIN)

  // The name is the first substantive line that is not a heading, a contact
  // detail, or a section label. Anything else is too unreliable to claim.
  const nameLine = nonEmpty.find((line) => {
    const text = clean(line)
    if (!text || text.length > 48) return false
    if (headingKey(text)) return false
    if (EMAIL.test(text) || PHONE.test(text) || LINKEDIN.test(text)) return false
    return /^[A-Za-z][A-Za-z'.\-\s]+$/.test(text) && text.split(/\s+/).length <= 5
  })

  const buckets: Record<SectionKey, string[]> = {
    summary: [], skills: [], experience: [], education: [], certifications: [], projects: [],
  }
  let current: SectionKey | null = null
  for (const line of lines) {
    const key = headingKey(line)
    if (key) {
      current = key
      continue
    }
    if (current && line.trim()) buckets[current].push(line)
  }

  const buildEntries = (sectionLines: string[]) => {
    const entries: ResumeData["experience"] = []
    let open: ResumeData["experience"][number] | null = null
    for (const line of sectionLines) {
      const header = splitRoleHeader(line)
      if (header) {
        if (open) entries.push(open)
        open = { ...header, bullets: [] }
        continue
      }
      if (!open) continue
      const text = clean(line).replace(BULLET_MARKER, "")
      if (!text) continue
      if (isBullet(line) || text.length > 40) open.bullets.push(text)
      else if (!open.organization) open.organization = text
    }
    if (open) entries.push(open)
    return entries
  }

  const experience = buildEntries(buckets.experience)
  const education = buildEntries(buckets.education).map((entry) => ({ ...entry, bullets: [] }))

  // Education is frequently written without a range, only a graduation year.
  // Recover those so the education check is not failed on a formatting habit.
  if (education.length === 0 && buckets.education.length > 0) {
    for (const line of buckets.education) {
      const text = clean(line).replace(BULLET_MARKER, "")
      if (text.length < 6) continue
      const year = parseResumeDate(text)
      const parts = text.split(/\s*[|,]\s*|\s+at\s+/).map(clean).filter(Boolean)
      education.push({
        title: parts[0] || text,
        organization: parts[1] || "",
        location: "",
        startDate: "",
        endDate: year ? String(year.year) : "",
        bullets: [],
      })
    }
  }

  return {
    ...emptyResumeData,
    fullName: nameLine ? clean(nameLine) : "",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? clean(phoneMatch[0]) : "",
    linkedinUrl: linkedinMatch ? clean(linkedinMatch[0]) : "",
    summary: clean(buckets.summary.join(" ")).slice(0, 2000),
    skills: splitSkills(buckets.skills).slice(0, 40),
    experience: experience.slice(0, 20),
    education: education.slice(0, 12),
    projects: buildEntries(buckets.projects).slice(0, 12),
    certifications: buckets.certifications
      .map((line) => clean(line).replace(BULLET_MARKER, ""))
      .filter((item) => item.length > 2)
      .slice(0, 20),
  }
}

/**
 * How much of the text the parser actually understood.
 *
 * A resume laid out in columns or exported from a design tool comes through
 * as an unstructured blob, and scoring that blob as though it were a clean
 * parse would report a low number for the wrong reason. The checker uses this
 * to say so plainly instead.
 */
export function parseConfidence(data: ResumeData, rawText: string): number {
  const signals = [
    data.fullName.length > 0,
    data.email.length > 0,
    data.experience.length > 0,
    data.experience.some((entry) => entry.bullets.length > 0),
    data.education.length > 0,
    data.skills.length > 0,
    data.summary.length > 0,
  ]
  const found = signals.filter(Boolean).length
  const density = Math.min(1, rawText.trim().length / 900)
  return Math.round((found / signals.length) * density * 100)
}
