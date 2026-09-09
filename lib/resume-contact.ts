/**
 * Contact-block extraction for uploaded resumes.
 *
 * Resume text is redacted before it is sent to a model, which is correct - an
 * email address and a phone number are not something a language model needs to
 * rewrite bullet points. But a resume without contact details is not a resume,
 * so the details are lifted out of the raw text here and merged back into the
 * generated document on the server, never passing through a prompt.
 */

export type ResumeContact = {
  fullName: string
  email: string
  phone: string
  location: string
  linkedinUrl: string
}

export const emptyResumeContact: ResumeContact = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
}

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_%-]+\/?/i

// A heading line, a section label, or a contact line is not a name. Anything
// left that is two to five capitalised words on one of the first few lines is.
const NAME_STOPWORDS = /(resume|curriculum vitae|cv|profile|summary|objective|contact|experience|education|skills)/i

function looksLikeName(line: string): boolean {
  if (line.length < 4 || line.length > 60) return false
  if (NAME_STOPWORDS.test(line)) return false
  if (EMAIL.test(line) || PHONE.test(line) || /\d/.test(line)) return false
  // A sentence, not a name. Names do not end in a full stop.
  if (line.endsWith(".")) return false
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 5) return false
  // Every word capitalised, which covers both "Ayesha Khan" and "AYESHA KHAN"
  // while rejecting the stray prose line that survives the other checks.
  return words.every((word) => /^[A-Z][A-Za-z'.-]*$/.test(word))
}

function extractLocation(lines: string[]): string {
  // "City, Country" or "City, ST" sitting on its own near the top.
  for (const line of lines.slice(0, 12)) {
    const candidate = line.replace(/^[|,\s•-]+|[|,\s•-]+$/g, "")
    if (candidate.length > 60 || EMAIL.test(candidate) || LINKEDIN.test(candidate)) continue
    if (/^[A-Za-z][A-Za-z .'-]{1,30},\s*[A-Za-z][A-Za-z .'-]{1,30}$/.test(candidate)) return candidate
  }
  return ""
}

export function extractResumeContact(rawText: string): ResumeContact {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const head = lines.slice(0, 15)
  const email = rawText.match(EMAIL)?.[0] || ""

  // Only trust a phone number found near the contact block. A bare digit run
  // deeper in the document is far more likely to be a date range or a metric.
  const phoneMatch = head.join("\n").match(PHONE)?.[0] || ""
  const phoneDigits = phoneMatch.replace(/\D/g, "")
  const phone = phoneDigits.length >= 9 && phoneDigits.length <= 15 ? phoneMatch.trim() : ""

  const linkedinRaw = rawText.match(LINKEDIN)?.[0] || ""
  const linkedinUrl = linkedinRaw
    ? linkedinRaw.startsWith("http")
      ? linkedinRaw.replace(/\/$/, "")
      : `https://${linkedinRaw.replace(/\/$/, "")}`
    : ""

  const fullName = head.slice(0, 6).find(looksLikeName) || ""

  return {
    fullName: fullName.slice(0, 160),
    email: email.slice(0, 200),
    phone: phone.slice(0, 80),
    location: extractLocation(head).slice(0, 120),
    linkedinUrl: linkedinUrl.slice(0, 300),
  }
}
