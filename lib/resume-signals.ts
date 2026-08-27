/**
 * Instant, local, zero-cost structural read of a resume.
 *
 * This is deliberately NOT the AI review. It only reports things that can be
 * observed directly in the text, so it can run in the browser on every
 * keystroke without a network call, a rate limit, or a failure mode. The full
 * recruiter/ATS review still lives behind /api/free-tools/ats-resume-checker.
 *
 * Everything here is an observation, never a prediction. If a signal cannot be
 * observed with confidence it is reported as unknown rather than guessed.
 */

export type SignalState = "pass" | "warn" | "fail"

export type ResumeSignal = {
  key: string
  label: string
  state: SignalState
  /** Short observed fact, e.g. "412 words" - never advice. */
  detail: string
}

export type ResumeSignals = {
  words: number
  signals: ResumeSignal[]
  /** Count of signals in each state, for the summary line. */
  passed: number
  total: number
}

const SECTION_PATTERNS: { key: string; label: string; pattern: RegExp }[] = [
  { key: "experience", label: "Experience", pattern: /\b(work\s+)?experience\b|\bemployment\b|\bprofessional\s+background\b/i },
  { key: "education", label: "Education", pattern: /\beducation\b|\bacademic\b|\bqualifications?\b/i },
  { key: "skills", label: "Skills", pattern: /\bskills?\b|\btechnical\s+skills\b|\bcompetenc(y|ies)\b/i },
]

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i
// Deliberately permissive: international formats, spaces, dashes, parens.
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/
const DATE_RANGE = /\b(19|20)\d{2}\s*(-|to|until|through|present|current)/i
const MONTH_YEAR = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(19|20)\d{2}/i
const BULLET_LINE = /^\s*([-*•●▪‣⁃>]|\d+[.)])\s+/
// A quantified claim: a percentage, a currency amount, a multiplier, or a
// plain number of meaningful size (avoids matching years and single digits).
const QUANTIFIED = /(\d+\s*%|[$£€₨]\s*\d|\b(pkr|usd|eur|gbp)\s*\d|\b\d+(\.\d+)?\s*x\b|\b\d{2,}(,\d{3})*\b)/i

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

export function analyzeResume(rawText: string): ResumeSignals {
  const text = rawText || ""
  const words = countWords(text)
  const lines = text.split(/\r?\n/)
  const signals: ResumeSignal[] = []

  // --- Length -------------------------------------------------------------
  // Recruiter-readable resumes cluster between roughly 350 and 900 words.
  const lengthState: SignalState = words < 200 ? "fail" : words < 350 || words > 1100 ? "warn" : "pass"
  signals.push({
    key: "length",
    label: "Length",
    state: lengthState,
    detail: words === 0 ? "No text yet" : `${words.toLocaleString()} words`,
  })

  // --- Standard sections --------------------------------------------------
  const found = SECTION_PATTERNS.filter((section) => section.pattern.test(text))
  signals.push({
    key: "sections",
    label: "Standard headings",
    state: found.length === 3 ? "pass" : found.length >= 2 ? "warn" : "fail",
    detail: found.length === 0 ? "None detected" : `${found.map((s) => s.label).join(", ")} found`,
  })

  // --- Contact details ----------------------------------------------------
  const hasEmail = EMAIL.test(text)
  const hasPhone = PHONE.test(text)
  signals.push({
    key: "contact",
    label: "Contact details",
    state: hasEmail && hasPhone ? "pass" : hasEmail || hasPhone ? "warn" : "fail",
    detail: hasEmail && hasPhone ? "Email and phone" : hasEmail ? "Email only" : hasPhone ? "Phone only" : "None detected",
  })

  // --- Parseable dates ----------------------------------------------------
  const dateHits = lines.filter((line) => DATE_RANGE.test(line) || MONTH_YEAR.test(line)).length
  signals.push({
    key: "dates",
    label: "Readable dates",
    state: dateHits >= 2 ? "pass" : dateHits === 1 ? "warn" : "fail",
    detail: dateHits === 0 ? "No date ranges found" : `${dateHits} dated ${dateHits === 1 ? "entry" : "entries"}`,
  })

  // --- Bullets ------------------------------------------------------------
  const bullets = lines.filter((line) => BULLET_LINE.test(line))
  signals.push({
    key: "bullets",
    label: "Bulleted achievements",
    state: bullets.length >= 6 ? "pass" : bullets.length >= 2 ? "warn" : "fail",
    detail: bullets.length === 0 ? "No bullet lines" : `${bullets.length} bullet ${bullets.length === 1 ? "line" : "lines"}`,
  })

  // --- Quantified results -------------------------------------------------
  // Measured against bullets when there are any, otherwise against all lines,
  // so a resume written in paragraphs is not unfairly marked down.
  const scope = bullets.length > 0 ? bullets : lines.filter((line) => line.trim().length > 24)
  const quantified = scope.filter((line) => QUANTIFIED.test(line)).length
  const quantRatio = scope.length > 0 ? quantified / scope.length : 0
  signals.push({
    key: "quantified",
    label: "Quantified results",
    state: quantRatio >= 0.3 ? "pass" : quantified > 0 ? "warn" : "fail",
    detail: quantified === 0 ? "No numbers found" : `${quantified} of ${scope.length} lines carry numbers`,
  })

  return {
    words,
    signals,
    passed: signals.filter((signal) => signal.state === "pass").length,
    total: signals.length,
  }
}

/** Minimum characters before the instant read is meaningful. */
export const MIN_RESUME_CHARS = 200

/** sessionStorage key used to hand a resume from the homepage to the full checker. */
export const RESUME_HANDOFF_KEY = "qalam_resume_handoff"
