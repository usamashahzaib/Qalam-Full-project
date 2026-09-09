/**
 * Deterministic ATS scoring engine.
 *
 * Every point this produces is traceable to a named check with an observed
 * fact and a fix. Nothing here calls a model, so the same resume always
 * scores the same number and the number can be defended line by line when a
 * recruiter, a CHRO, or a candidate asks how it was reached.
 *
 * The AI layer is still used for writing and for qualitative judgement. It is
 * no longer used to produce the score, because a model guessed number is not
 * auditable and drifts between runs on identical input.
 *
 * Scale: each factor scores 0 to 100 from its own checks, then factors are
 * combined using the published weights in lib/ats-methodology.ts. A resume
 * that passes every check reaches 100, and every check is reachable through
 * truthful edits.
 */

import { ATS_FACTORS } from "@/lib/ats-methodology"
import type { ResumeData } from "@/lib/career-resume"

export const ATS_ENGINE_VERSION = "2.0"

export type AtsFactorKey = (typeof ATS_FACTORS)[number]["key"]
export type AtsCheckState = "pass" | "warn" | "fail" | "na"

export type AtsCheck = {
  id: string
  label: string
  state: AtsCheckState
  /** 0 to 100 within this check. */
  score: number
  /** Relative importance of this check inside its factor. */
  weight: number
  /** Observed fact, never advice. */
  detail: string
  /** Exact action that recovers the lost points. Empty when the check passes. */
  fix: string
  /** Overall points on the 100 point scale still recoverable from this check. */
  pointsAtStake: number
}

export type AtsFactorResult = {
  key: AtsFactorKey
  name: string
  weight: number
  definition: string
  score: number
  /** Points this factor contributes to the overall score right now. */
  earned: number
  checks: AtsCheck[]
}

export type AtsKeyword = {
  keyword: string
  /** Relative importance derived from the job description. */
  weight: number
  found: boolean
  /** Where the evidence was found, or an empty string when missing. */
  where: string
}

export type AtsSuggestion = {
  priority: number
  factor: string
  checkId: string
  action: string
  detail: string
  /** Overall points recovered by resolving this suggestion. */
  pointsAvailable: number
}

export type AtsStats = {
  words: number
  bullets: number
  quantifiedBullets: number
  roles: number
  estimatedPages: number
}

export type AtsAudit = {
  version: string
  overall: number
  band: "strong" | "developing" | "at_risk"
  /** True when no job description was supplied, so alignment is role standard. */
  provisional: boolean
  factors: AtsFactorResult[]
  keywords: { coverage: number; matched: AtsKeyword[]; missing: AtsKeyword[] }
  suggestions: AtsSuggestion[]
  stats: AtsStats
}

// --------------------------------------------------------------------------
// Lexicons
// --------------------------------------------------------------------------

const STOPWORDS = new Set(
  `a an and are as at be been being but by for from had has have he her his if in into is it its of on or our ours she that the their them they this to was we were what when where which who will with you your yours able about above after again against all also am any because before below between both call can could did do does doing down during each else etc few further here how i just like made make many may me more most much must my no nor not now off once only other over own same should so some such than then there these those through too under until up very via while why would across around ability abilities based including include includes required require requires requirement requirements responsibility responsibilities role roles job jobs position positions candidate candidates applicant applicants company companies organisation organization organizations team teams work working works experience experienced years year month months day days new good great strong excellent successful ideal preferred plus benefit benefits offer offers salary apply application please contact us join looking seeking hire hiring opportunity opportunities environment culture growth passion passionate dynamic fast paced world class cutting edge`.split(
    /\s+/,
  ).filter(Boolean),
)

/** Words that appear in almost every posting and carry no screening signal. */
const JD_NOISE = new Set([
  "skills", "knowledge", "understanding", "background", "degree", "bachelor", "bachelors",
  "master", "masters", "field", "related", "equivalent", "minimum", "preferred", "familiarity",
  "proficiency", "proficient", "strong", "solid", "deep", "hands", "level", "high", "well",
  "part", "full", "time", "remote", "hybrid", "onsite", "office", "location", "reporting",
  "report", "reports", "please", "resume",
])

/** Terms that are real screening keywords even though they are short. */
const SHORT_KEYWORD_ALLOW = new Set([
  "ai", "ml", "bi", "qa", "ux", "ui", "hr", "pm", "po", "cx", "go", "c#", "c++", "js", "ts",
  "py", "sql", "aws", "gcp", "css", "erp", "crm", "seo", "sem", "api", "etl", "p&l", "roi",
  "kpi", "sla", "b2b", "b2c", "eda", "npv", "irr", "gst", "vat", "ifrs", "gaap", "sox", "cpa",
  "cfa", "pmp", "acca", "saas", "rest", "java", "node", "sap",
])

/** Variant folding so a resume is not penalised for a spelling of the same tool. */
const KEYWORD_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  golang: "go",
  nodejs: "node",
  "node.js": "node",
  reactjs: "react",
  "react.js": "react",
  nextjs: "next",
  "next.js": "next",
  vuejs: "vue",
  postgres: "postgresql",
  psql: "postgresql",
  k8s: "kubernetes",
  gcp: "google cloud",
  "amazon web services": "aws",
  "power bi": "powerbi",
  "ci/cd": "cicd",
  "a/b testing": "ab testing",
  "machine learning": "ml",
  "artificial intelligence": "ai",
  "search engine optimization": "seo",
  "profit and loss": "p&l",
  "return on investment": "roi",
}

const ACTION_VERBS = new Set(
  `accelerated achieved acquired adapted administered advanced advised analysed analyzed architected assembled assessed audited authored automated balanced benchmarked boosted brokered budgeted built captured centralised centralized chaired championed clarified closed coached collaborated compiled completed composed conceived condensed conducted configured consolidated constructed consulted converted coordinated created cultivated cut decreased defined delivered demonstrated deployed designed developed devised diagnosed directed doubled drafted drove earned edited educated eliminated enabled engineered enhanced established evaluated executed expanded expedited facilitated finalised finalized forecast forecasted formulated founded generated grew guided halved headed identified implemented improved increased influenced informed initiated innovated inspected installed instituted integrated introduced invented investigated launched led leveraged localised localized maintained managed mapped marketed maximised maximized measured mediated mentored merged migrated minimised minimized modelled modeled modernised modernized monitored motivated negotiated onboarded operated optimised optimized orchestrated organised organized outperformed overhauled oversaw partnered performed piloted pioneered planned prepared presented prevented prioritised prioritized processed produced programmed projected promoted proposed prototyped published quantified raised rebuilt recovered recruited redesigned reduced refactored refined reinforced remodelled reorganised reorganized repaired replaced reported repositioned rescued researched resolved restored restructured revamped reviewed revised revitalised revitalized saved scaled scheduled secured selected shaped shipped simplified sold solved sourced spearheaded specified standardised standardized steered streamlined strengthened structured supervised surpassed surveyed sustained synthesised synthesized targeted taught tested tightened tracked trained transformed translated tripled troubleshot turned unified updated upgraded validated verified won wrote`.split(
    /\s+/,
  ),
)

const DUTY_PHRASES = [
  "responsible for", "duties included", "duties include", "tasked with", "in charge of",
  "worked on", "helped with", "assisted with", "involved in", "participated in",
  "my job was", "my role was", "day to day", "day-to-day tasks",
]

const BUZZWORDS = [
  "team player", "hard working", "hardworking", "self starter", "self-starter", "go getter",
  "think outside the box", "results driven", "results-driven", "detail oriented",
  "detail-oriented", "dynamic professional", "proven track record", "synergy", "value add",
  "value-add", "passionate about", "highly motivated", "excellent communication skills",
  "works well under pressure",
]

const FIRST_PERSON = /\b(i|me|my|mine|myself|we|our|ours)\b/i

/** Characters that survive a copy paste but break or garble an ATS parse. */
const UNSAFE_CHARS =
  /[\u2028\u2029\uFFFD\u200B-\u200F\u202A-\u202E]|[\u{1F300}-\u{1FAFF}]|[\u2190-\u21FF]|[\u2500-\u257F]|[\u25A0-\u25FF]/u

const QUANTIFIED =
  /(\d+\s*%|\bpercent\b|[$£€₨]\s?\d|\b(pkr|usd|eur|gbp|inr|aed|sar)\s?\d|\b\d+(\.\d+)?\s?(x|times)\b|\b\d+(\.\d+)?\s?(k|m|bn|million|billion|lakh|crore)\b|\b\d{2,}(,\d{3})*(\.\d+)?\b)/i

const OUTCOME_WORDS =
  /\b(result|resulted|resulting|driving|drove|leading to|led to|enabling|enabled|delivering|delivered|saving|saved|increasing|increased|reducing|reduced|growing|grew|improving|improved|cutting|generating|generated|unlocking|achieving|achieved)\b/i

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

const SENIORITY_TIERS: { tier: number; terms: string[] }[] = [
  { tier: 5, terms: ["chief", "ceo", "cto", "cfo", "coo", "chro", "cmo", "president", "partner", "vp", "vice president", "svp", "evp"] },
  { tier: 4, terms: ["head of", "director", "principal", "distinguished"] },
  { tier: 3, terms: ["manager", "lead", "senior", "sr.", "staff", "supervisor"] },
  { tier: 2, terms: ["specialist", "analyst", "engineer", "associate", "executive", "officer", "consultant"] },
  { tier: 1, terms: ["junior", "jr.", "intern", "trainee", "graduate", "entry", "assistant", "apprentice"] },
]

// --------------------------------------------------------------------------
// Text helpers
// --------------------------------------------------------------------------

const lower = (value: string) => (value || "").toLowerCase()

const words = (value: string) => (value || "").trim().split(/\s+/).filter(Boolean)

const normalizeTerm = (term: string) => {
  const cleaned = lower(term)
    .trim()
    .replace(/[^a-z0-9+#&.\/\s-]/g, "")
    .replace(/\s+/g, " ")
    // Trailing punctuation survives tokenising because "." and "-" are kept
    // for terms such as "node.js" and "e-commerce". Strip it at the edges
    // only, so "seo." and "seo" are never counted as two keywords.
    .replace(/^[.\-\/]+|[.\-\/]+$/g, "")
    .trim()
  return KEYWORD_ALIASES[cleaned] || cleaned
}

/** Cheap suffix folding so "manage", "managed" and "managing" match. */
const stem = (term: string) =>
  term.length > 4 ? term.replace(/(ations|ation|ings|ing|ies|ied|ers|er|ed|es|s)$/i, "") : term

/**
 * Punctuation inside a term is not a difference a screener cares about, but
 * it does stop a naive substring match: an alias resolves "A/B testing" to
 * "ab testing", which then fails against the resume's own "A/B testing". The
 * fold is applied to both sides so the two forms always meet.
 */
const foldPunctuation = (value: string) => value.replace(/[.\-\/]/g, "")

const containsTerm = (haystack: string, term: string) => {
  const needle = normalizeTerm(term)
  if (!needle) return false
  if (haystack.includes(needle)) return true
  const folded = foldPunctuation(haystack)
  const foldedNeedle = foldPunctuation(needle)
  if (foldedNeedle && folded.includes(foldedNeedle)) return true
  const parts = foldedNeedle.split(" ")
  if (parts.length > 1) return parts.every((part) => folded.includes(stem(part)))
  return folded.includes(stem(foldedNeedle))
}

const pct = (part: number, whole: number) => (whole > 0 ? part / whole : 0)

/** Maps a ratio onto 0 to 100 with a floor at `floor` and full marks at `target`. */
const ratioScore = (ratio: number, target: number, floor = 0) => {
  if (ratio >= target) return 100
  if (ratio <= floor) return 0
  return Math.round(((ratio - floor) / (target - floor)) * 100)
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

// --------------------------------------------------------------------------
// Date handling
// --------------------------------------------------------------------------

export type ParsedDate = { year: number; month: number; present: boolean } | null

export function parseResumeDate(value: string): ParsedDate {
  const text = lower(value).trim()
  if (!text) return null
  if (/\b(present|current|now|ongoing|to date|till date)\b/.test(text)) {
    const now = new Date()
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, present: true }
  }
  const monthYear = text.match(/\b([a-z]{3,9})\.?\s+((?:19|20)\d{2})\b/)
  if (monthYear) {
    const month = MONTHS[monthYear[1].slice(0, 4)] ?? MONTHS[monthYear[1].slice(0, 3)]
    if (month) return { year: Number(monthYear[2]), month, present: false }
  }
  const numeric = text.match(/\b(0?[1-9]|1[0-2])[\/.-]((?:19|20)\d{2})\b/)
  if (numeric) return { year: Number(numeric[2]), month: Number(numeric[1]), present: false }
  const yearOnly = text.match(/\b((?:19|20)\d{2})\b/)
  if (yearOnly) return { year: Number(yearOnly[1]), month: 1, present: false }
  return null
}

const monthIndex = (date: NonNullable<ParsedDate>) => date.year * 12 + date.month

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Mon YYYY" is the format every major parser reads without ambiguity. */
export const formatResumeDate = (value: string): string => {
  const text = lower(value).trim()
  if (!text) return ""
  if (/\b(present|current|now|ongoing|to date|till date)\b/.test(text)) return "Present"
  const parsed = parseResumeDate(value)
  if (!parsed) return value.trim()
  const hasMonth = /[a-z]{3}/.test(text) || /[\/.-]/.test(text)
  return hasMonth ? `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}` : String(parsed.year)
}

// --------------------------------------------------------------------------
// Job description keyword extraction
// --------------------------------------------------------------------------

/**
 * Pulls the terms a screener would actually filter on out of a posting.
 *
 * Frequency alone surfaces boilerplate, so terms found inside a requirements
 * or qualifications block are boosted and generic posting vocabulary is
 * dropped outright. The result is weighted, which is what makes keyword
 * coverage a defensible percentage rather than a raw hit count.
 */
export function extractJobKeywords(jobDescription: string, limit = 28): { keyword: string; weight: number }[] {
  const raw = jobDescription || ""
  if (raw.trim().length < 40) return []

  const requirementBlock = (() => {
    const match = raw.match(
      /(requirements?|qualifications?|what you.{0,12}(need|bring)|must have|you have|skills? (and|&) experience)[\s\S]{0,2600}/i,
    )
    return lower(match ? match[0] : "")
  })()

  // Bigrams must not span a sentence, bullet, or list boundary. Without this
  // a posting yields phantom phrases such as "generation deep" that no
  // resume could ever contain, which understates coverage.
  const segments = lower(raw)
    .split(/[.;:!?\n\r•|]+|(?:\s-\s)/)
    .map((segment) => segment.replace(/[^a-z0-9+#&\/\s-]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  const counts = new Map<string, number>()

  const bump = (term: string, amount: number) => {
    const key = normalizeTerm(term)
    if (!key) return
    counts.set(key, (counts.get(key) || 0) + amount)
  }

  const usable = (token: string) => {
    if (SHORT_KEYWORD_ALLOW.has(token)) return true
    if (token.length < 4) return false
    if (STOPWORDS.has(token) || JD_NOISE.has(token)) return false
    if (/^\d+$/.test(token)) return false
    return true
  }

  for (const segment of segments) {
    const tokens = segment.split(" ").filter(Boolean)
    tokens.forEach((token, index) => {
      if (usable(token)) bump(token, 1)
      const next = tokens[index + 1]
      if (!next) return
      if (STOPWORDS.has(token) || STOPWORDS.has(next)) return
      if (JD_NOISE.has(token) || JD_NOISE.has(next)) return
      if (token.length < 3 || next.length < 3) return
      bump(`${token} ${next}`, 1.4)
    })
  }

  for (const [term, count] of Array.from(counts.entries())) {
    if (requirementBlock.includes(term)) counts.set(term, count * 1.8)
  }

  const ranked = Array.from(counts.entries())
    .filter(([term, count]) => count >= 1.4 || SHORT_KEYWORD_ALLOW.has(term))
    .sort((a, b) => b[1] - a[1])

  // Drop a unigram when a stronger bigram already contains it, so "project"
  // and "project management" do not both consume a keyword slot.
  const chosen: { keyword: string; weight: number }[] = []
  for (const [term, count] of ranked) {
    if (chosen.length >= limit) break
    if (chosen.some((item) => item.keyword !== term && item.keyword.includes(term))) continue
    chosen.push({ keyword: term, weight: count })
  }

  const top = chosen[0]?.weight || 1
  return chosen.map((item) => ({
    keyword: item.keyword,
    weight: Math.max(1, Math.round((item.weight / top) * 10)),
  }))
}

// --------------------------------------------------------------------------
// Resume flattening
// --------------------------------------------------------------------------

type ResumeShape = {
  data: ResumeData
  allText: string
  bulletText: string
  bullets: string[]
  wordCount: number
}

const flatten = (data: ResumeData): ResumeShape => {
  const bullets = [...data.experience.flatMap((entry) => entry.bullets), ...data.projects.flatMap((entry) => entry.bullets)]
  const pieces = [
    data.fullName, data.headline, data.summary, data.location, data.linkedinUrl,
    data.skills.join(" "), data.certifications.join(" "),
    ...[...data.experience, ...data.education, ...data.projects].flatMap((entry) => [
      entry.title, entry.organization, entry.location, entry.startDate, entry.endDate, entry.bullets.join(" "),
    ]),
  ]
  const allText = lower(pieces.filter(Boolean).join(" \n "))
  return {
    data,
    allText,
    bulletText: lower(bullets.join(" \n ")),
    bullets,
    wordCount: words(pieces.join(" ")).length,
  }
}

const seniorityTier = (title: string) => {
  const text = lower(title)
  for (const level of SENIORITY_TIERS) {
    if (level.terms.some((term) => text.includes(term))) return level.tier
  }
  return 2
}

// --------------------------------------------------------------------------
// Check builder
// --------------------------------------------------------------------------

type CheckInput = { id: string; label: string; weight: number; score: number; detail: string; fix?: string }

const check = (input: CheckInput): AtsCheck => {
  const score = clampScore(input.score)
  return {
    id: input.id,
    label: input.label,
    weight: input.weight,
    score,
    state: score >= 100 ? "pass" : score >= 60 ? "warn" : "fail",
    detail: input.detail,
    fix: score >= 100 ? "" : input.fix || "",
    pointsAtStake: 0,
  }
}

const naCheck = (id: string, label: string, detail: string): AtsCheck => ({
  id, label, weight: 0, score: 100, state: "na", detail, fix: "", pointsAtStake: 0,
})

// --------------------------------------------------------------------------
// Factor checks
// --------------------------------------------------------------------------

function parsingChecks(shape: ResumeShape): AtsCheck[] {
  const { data } = shape
  const contactParts = [
    { key: "full name", value: data.fullName },
    { key: "email", value: data.email },
    { key: "phone", value: data.phone },
    { key: "city and country", value: data.location },
  ]
  const missingContact = contactParts.filter((part) => !part.value.trim())
  const emailValid = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(data.email.trim())
  const phoneDigits = data.phone.replace(/\D/g, "")

  const datedEntries = data.experience.filter((entry) => parseResumeDate(entry.startDate))
  const undatedEntries = data.experience.length - datedEntries.length

  const sections = [
    { name: "Experience", present: data.experience.length > 0 },
    { name: "Education", present: data.education.length > 0 },
    { name: "Skills", present: data.skills.length > 0 },
    { name: "Summary", present: data.summary.trim().length > 0 },
  ]
  const missingSections = sections.filter((section) => !section.present)

  const unsafeFields = [data.fullName, data.headline, data.summary, ...data.skills, ...shape.bullets].filter((value) =>
    UNSAFE_CHARS.test(value),
  )

  const pages = Math.max(1, Math.ceil(shape.wordCount / 480))
  const pageTarget = data.experience.length >= 5 ? 3 : 2

  return [
    check({
      id: "contact_block",
      label: "Machine readable contact block",
      weight: 26,
      score: missingContact.length === 0 ? 100 : missingContact.length === 1 ? 60 : 20,
      detail:
        missingContact.length === 0
          ? "Name, email, phone and location are all present"
          : `Missing ${missingContact.map((part) => part.key).join(", ")}`,
      fix: `Add ${missingContact.map((part) => part.key).join(", ")} as plain text in the top block, not in a header, footer, image or text box.`,
    }),
    check({
      id: "contact_valid",
      label: "Contact values parse cleanly",
      weight: 14,
      score: emailValid && phoneDigits.length >= 9 ? 100 : emailValid || phoneDigits.length >= 9 ? 55 : 0,
      detail: `Email ${emailValid ? "parses" : "does not parse"}, phone has ${phoneDigits.length} digits`,
      fix: "Use one plain email address and a full phone number in international format, for example +92 300 1234567.",
    }),
    check({
      id: "standard_sections",
      label: "Standard section headings",
      weight: 22,
      score: missingSections.length === 0 ? 100 : missingSections.length === 1 ? 70 : missingSections.length === 2 ? 40 : 10,
      detail:
        missingSections.length === 0
          ? "Summary, Experience, Education and Skills all present"
          : `Missing ${missingSections.map((section) => section.name).join(", ")}`,
      fix: `Add ${missingSections.map((section) => section.name).join(", ")}. Applicant tracking systems index by standard heading names, so avoid creative labels such as "My Journey".`,
    }),
    check({
      id: "dated_entries",
      label: "Every role carries a parseable date",
      weight: 18,
      score: data.experience.length === 0 ? 0 : ratioScore(pct(datedEntries.length, data.experience.length), 1, 0),
      detail:
        data.experience.length === 0
          ? "No experience entries to date"
          : undatedEntries === 0
            ? `All ${data.experience.length} roles carry a start date`
            : `${undatedEntries} of ${data.experience.length} roles have no readable start date`,
      fix: 'Write every date as "Mon YYYY", for example "Mar 2021 - Present". Season names, "ongoing" and blank fields do not parse.',
    }),
    check({
      id: "safe_characters",
      label: "No characters that garble a parse",
      weight: 12,
      score: unsafeFields.length === 0 ? 100 : 0,
      detail:
        unsafeFields.length === 0
          ? "No emoji, icons, arrows or box characters found"
          : `${unsafeFields.length} field${unsafeFields.length === 1 ? "" : "s"} contain characters an ATS cannot read`,
      fix: "Remove emoji, icon glyphs, arrows and box drawing characters. Use plain words instead.",
    }),
    check({
      id: "length_fit",
      label: "Length fits recruiter expectation",
      weight: 8,
      score:
        shape.wordCount < 180 ? 20 : shape.wordCount < 260 ? 70 : pages <= pageTarget ? 100 : pages === pageTarget + 1 ? 60 : 25,
      detail: `About ${shape.wordCount} words, roughly ${pages} page${pages === 1 ? "" : "s"}`,
      fix:
        shape.wordCount < 260
          ? "The resume is too thin to screen. Add scope, tools and outcomes to each recent role."
          : `Trim to ${pageTarget} pages by cutting older roles down to one or two lines.`,
    }),
  ]
}

function alignmentChecks(shape: ResumeShape, targetRole: string, keywords: AtsKeyword[], hasJd: boolean): AtsCheck[] {
  const { data, allText } = shape
  const weightTotal = keywords.reduce((total, item) => total + item.weight, 0)
  const weightFound = keywords.filter((item) => item.found).reduce((total, item) => total + item.weight, 0)
  const coverage = weightTotal > 0 ? weightFound / weightTotal : 0

  const roleTokens = words(lower(targetRole)).filter((token) => token.length > 2 && !STOPWORDS.has(token))
  const recentTitle = lower(data.experience[0]?.title || "")
  const headlineText = lower(data.headline)
  const titleHits = roleTokens.filter((token) => headlineText.includes(stem(token)) || recentTitle.includes(stem(token)))

  const targetTier = seniorityTier(targetRole)
  const candidateTier = data.experience.length
    ? Math.max(...data.experience.slice(0, 3).map((entry) => seniorityTier(entry.title)))
    : 0
  const tierGap = Math.abs(targetTier - candidateTier)

  const skillHits = data.skills.filter((skill) =>
    keywords.some((item) => containsTerm(normalizeTerm(skill), item.keyword) || containsTerm(item.keyword, normalizeTerm(skill))),
  )

  const checks: AtsCheck[] = [
    check({
      id: "keyword_coverage",
      label: hasJd ? "Job description keyword coverage" : "Role standard keyword coverage",
      weight: 46,
      score: keywords.length === 0 ? 60 : ratioScore(coverage, 0.75, 0.1),
      detail:
        keywords.length === 0
          ? "No target keywords could be extracted"
          : `${Math.round(coverage * 100)} percent of weighted target keywords are evidenced`,
      fix: hasJd
        ? "Work the missing keywords listed below into the roles where you genuinely did that work. Never add a keyword you cannot defend in an interview."
        : "Add a job description to score against the exact posting, or work the listed role standard terms into roles where they are true.",
    }),
    check({
      id: "title_alignment",
      label: "Headline and recent title match the target",
      weight: 24,
      score: roleTokens.length === 0 ? 60 : ratioScore(pct(titleHits.length, roleTokens.length), 0.6, 0),
      detail:
        roleTokens.length === 0
          ? "No target role supplied"
          : titleHits.length === 0
            ? `Neither the headline nor the most recent title carries "${targetRole}"`
            : `${titleHits.length} of ${roleTokens.length} target role terms appear in the headline or recent title`,
      fix: `Set the headline to the target role wording, for example "${targetRole || "the exact posting title"}". Keep real job titles unchanged, and add the market equivalent in brackets only when it is accurate.`,
    }),
    check({
      id: "seniority_alignment",
      label: "Seniority reads at the target level",
      weight: 16,
      score: candidateTier === 0 ? 0 : tierGap === 0 ? 100 : tierGap === 1 ? 70 : 35,
      detail:
        candidateTier === 0
          ? "No experience entries to read seniority from"
          : tierGap === 0
            ? "Recent scope reads at the target level"
            : `Recent scope reads ${candidateTier > targetTier ? "above" : "below"} the target level`,
      fix: "Make scope explicit in the recent bullets: team size, budget, region, or revenue owned. Seniority is read from scope, not from the job title alone.",
    }),
    check({
      id: "skills_target_overlap",
      label: "Skills section carries target terms",
      weight: 14,
      score:
        keywords.length === 0 ? 60 : data.skills.length === 0 ? 0 : ratioScore(pct(skillHits.length, Math.min(keywords.length, 12)), 0.5, 0),
      detail:
        data.skills.length === 0
          ? "No skills listed"
          : `${skillHits.length} listed skill${skillHits.length === 1 ? "" : "s"} match the target vocabulary`,
      fix: "List the target tools and methods you genuinely use in the Skills section, spelled the way the posting spells them.",
    }),
  ]

  if (!hasJd) {
    checks.push(
      naCheck(
        "jd_provisional",
        "Scored without a job description",
        "Alignment is measured against role standard expectations. Paste the posting for an exact match.",
      ),
    )
  }
  return checks
}

function recruiterReadChecks(shape: ResumeShape): AtsCheck[] {
  const { data } = shape
  const summaryWords = words(data.summary).length
  const headlineWords = words(data.headline).length
  const topRole = data.experience[0]
  const topBullets = topRole?.bullets.length || 0
  const longBullets = shape.bullets.filter((bullet) => words(bullet).length > 32).length

  const dated = data.experience
    .map((entry) => parseResumeDate(entry.endDate) || parseResumeDate(entry.startDate))
    .filter(Boolean) as NonNullable<ParsedDate>[]
  const reverseChronological = dated.every((date, index) => index === 0 || monthIndex(dated[index - 1]) >= monthIndex(date))

  return [
    check({
      id: "headline_present",
      label: "Headline states the professional identity",
      weight: 22,
      score: headlineWords === 0 ? 0 : headlineWords < 3 ? 55 : headlineWords <= 14 ? 100 : 65,
      detail: headlineWords === 0 ? "No headline" : `Headline is ${headlineWords} words`,
      fix: 'Write a headline of three to twelve words naming the role and the domain, for example "Financial Controller | Manufacturing | IFRS Reporting".',
    }),
    check({
      id: "summary_length",
      label: "Summary is scannable in six seconds",
      weight: 22,
      score: summaryWords === 0 ? 0 : summaryWords < 25 ? 50 : summaryWords <= 90 ? 100 : summaryWords <= 130 ? 65 : 30,
      detail: summaryWords === 0 ? "No summary" : `Summary is ${summaryWords} words`,
      fix: "Write a summary of forty to eighty words covering years of experience, domain, the two strongest proof points, and what you are targeting.",
    }),
    check({
      id: "reverse_chronological",
      label: "Roles run newest first",
      weight: 20,
      score: data.experience.length < 2 ? 100 : reverseChronological ? 100 : 25,
      detail:
        data.experience.length < 2
          ? "Single role, ordering not applicable"
          : reverseChronological
            ? "Newest role appears first"
            : "Roles are not in reverse chronological order",
      fix: "Order every role newest first. Recruiters and parsers both read the top entry as your current level.",
    }),
    check({
      id: "recent_role_depth",
      label: "Most recent role carries enough proof",
      weight: 22,
      score: !topRole ? 0 : topBullets >= 4 ? 100 : topBullets === 3 ? 80 : topBullets > 0 ? 45 : 0,
      detail: !topRole ? "No experience entries" : `Most recent role has ${topBullets} bullet${topBullets === 1 ? "" : "s"}`,
      fix: "Give the most recent role four to six bullets. It is the only block many recruiters read in full.",
    }),
    check({
      id: "bullet_scannability",
      label: "Bullets stay one to two lines",
      weight: 14,
      score: shape.bullets.length === 0 ? 0 : ratioScore(1 - pct(longBullets, shape.bullets.length), 0.95, 0.5),
      detail: shape.bullets.length === 0 ? "No bullets" : `${longBullets} of ${shape.bullets.length} bullets run past 32 words`,
      fix: "Split any bullet longer than about thirty words into two, or cut the setup and keep the action and the outcome.",
    }),
  ]
}

function evidenceChecks(shape: ResumeShape): AtsCheck[] {
  const bullets = shape.bullets
  const quantified = bullets.filter((bullet) => QUANTIFIED.test(bullet)).length
  const verbLed = bullets.filter((bullet) => {
    const first = lower(words(bullet)[0] || "").replace(/[^a-z]/g, "")
    return ACTION_VERBS.has(first)
  }).length
  const outcomes = bullets.filter((bullet) => OUTCOME_WORDS.test(bullet)).length
  const duties = bullets.filter((bullet) => DUTY_PHRASES.some((phrase) => lower(bullet).includes(phrase)))

  return [
    check({
      id: "quantified_results",
      label: "Bullets carry numbers",
      weight: 36,
      score: bullets.length === 0 ? 0 : ratioScore(pct(quantified, bullets.length), 0.4, 0),
      detail:
        bullets.length === 0
          ? "No bullets"
          : `${quantified} of ${bullets.length} bullets carry a number, percentage, or amount`,
      fix: "Add a real figure to at least four in ten bullets: volume, value, headcount, time saved, percentage moved. Use a defensible range when the exact number is confidential.",
    }),
    check({
      id: "action_verbs",
      label: "Bullets open with an action verb",
      weight: 28,
      score: bullets.length === 0 ? 0 : ratioScore(pct(verbLed, bullets.length), 0.9, 0.2),
      detail: bullets.length === 0 ? "No bullets" : `${verbLed} of ${bullets.length} bullets open with an action verb`,
      fix: 'Start every bullet with a past tense action verb such as "Delivered", "Reduced", "Negotiated". Drop openings like "Was involved in".',
    }),
    check({
      id: "outcome_language",
      label: "Bullets state an outcome, not only an activity",
      weight: 24,
      score: bullets.length === 0 ? 0 : ratioScore(pct(outcomes, bullets.length), 0.5, 0),
      detail: bullets.length === 0 ? "No bullets" : `${outcomes} of ${bullets.length} bullets connect the action to a result`,
      fix: "Use the action, scope, result shape: what you did, at what scale, and what changed as a consequence.",
    }),
    check({
      id: "no_duty_language",
      label: "No passive duty phrasing",
      weight: 12,
      score: bullets.length === 0 ? 0 : duties.length === 0 ? 100 : duties.length === 1 ? 60 : 20,
      detail:
        duties.length === 0
          ? "No duty phrasing found"
          : `${duties.length} bullet${duties.length === 1 ? "" : "s"} use phrasing such as "responsible for"`,
      fix: 'Replace "Responsible for X" with the verb that describes what you actually did to X.',
    }),
  ]
}

function progressionChecks(shape: ResumeShape): AtsCheck[] {
  const { data } = shape
  const entries = data.experience
    .map((entry) => ({ entry, start: parseResumeDate(entry.startDate), end: parseResumeDate(entry.endDate) }))
    .filter((item) => item.start) as {
    entry: ResumeData["experience"][number]
    start: NonNullable<ParsedDate>
    end: ParsedDate
  }[]

  const sorted = [...entries].sort((a, b) => monthIndex(b.start) - monthIndex(a.start))

  let largestGap = 0
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const laterStart = monthIndex(sorted[index].start)
    const earlier = sorted[index + 1].end
    if (!earlier) continue
    largestGap = Math.max(largestGap, laterStart - monthIndex(earlier))
  }

  const tenures = sorted.map((item) => {
    const end = item.end ? monthIndex(item.end) : monthIndex(item.start)
    return Math.max(0, end - monthIndex(item.start))
  })
  const shortStints = tenures.filter((months) => months > 0 && months < 12).length
  const tiers = sorted.map((item) => seniorityTier(item.entry.title))
  const climbed = tiers.length < 2 ? true : tiers[0] >= Math.max(...tiers.slice(1))

  return [
    check({
      id: "history_depth",
      label: "Enough history to read a trajectory",
      weight: 26,
      score: data.experience.length === 0 ? 0 : data.experience.length === 1 ? 60 : 100,
      detail: `${data.experience.length} role${data.experience.length === 1 ? "" : "s"} listed`,
      fix: "List at least the last two roles, even briefly. A single entry gives a screener no trajectory to read.",
    }),
    check({
      id: "timeline_complete",
      label: "Timeline has no unexplained gap",
      weight: 26,
      score: sorted.length < 2 ? 100 : largestGap <= 3 ? 100 : largestGap <= 6 ? 80 : largestGap <= 12 ? 55 : 30,
      detail:
        sorted.length < 2
          ? "Not enough dated roles to measure gaps"
          : largestGap <= 3
            ? "No gap longer than three months"
            : `Largest gap is about ${largestGap} months`,
      fix: 'Label any gap over six months honestly on the timeline, for example "Career break - full time caregiving" or "Independent consulting". An explained gap does not count against you, an unexplained one does.',
    }),
    check({
      id: "tenure_pattern",
      label: "Tenure pattern does not read as churn",
      weight: 24,
      score: tenures.length < 2 ? 100 : ratioScore(1 - pct(shortStints, tenures.length), 0.7, 0.2),
      detail:
        tenures.length < 2
          ? "Not enough dated roles to measure tenure"
          : `${shortStints} of ${tenures.length} roles ran under twelve months`,
      fix: "Group contract, agency and consulting work under one employer heading with the engagements as sub entries, so short assignments do not read as job hopping.",
    }),
    check({
      id: "scope_growth",
      label: "Scope grows across the history",
      weight: 24,
      score: tiers.length < 2 ? 100 : climbed ? 100 : 50,
      detail:
        tiers.length < 2
          ? "Single role, progression not applicable"
          : climbed
            ? "Most recent role holds the widest scope"
            : "An earlier role reads as more senior than the current one",
      fix: "If a recent move was sideways or a step back, name the reason in the bullet, for example a domain switch or a scale up brief. Otherwise make the current scope explicit.",
    }),
  ]
}

function skillsChecks(shape: ResumeShape): AtsCheck[] {
  const { data } = shape
  const unique = new Set(data.skills.map((skill) => normalizeTerm(skill)))
  const duplicates = data.skills.length - unique.size
  const evidenceText = `${shape.bulletText} ${lower(data.summary)}`
  const evidenced = data.skills.filter((skill) => containsTerm(evidenceText, skill)).length

  return [
    check({
      id: "skills_volume",
      label: "Skills list is the right size",
      weight: 28,
      score: data.skills.length === 0 ? 0 : data.skills.length < 6 ? 55 : data.skills.length <= 22 ? 100 : 55,
      detail: `${data.skills.length} skill${data.skills.length === 1 ? "" : "s"} listed`,
      fix: "List eight to twenty skills. Fewer starves the keyword match, more reads as stuffing and dilutes every term.",
    }),
    check({
      id: "skills_evidenced",
      label: "Skills are backed by the work history",
      weight: 44,
      score: data.skills.length === 0 ? 0 : ratioScore(pct(evidenced, data.skills.length), 0.6, 0),
      detail:
        data.skills.length === 0
          ? "No skills listed"
          : `${evidenced} of ${data.skills.length} skills also appear in the summary or a bullet`,
      fix: "For every listed skill, make sure at least one bullet shows you using it. A skill with no supporting evidence is the first thing a screener discounts.",
    }),
    check({
      id: "skills_clean",
      label: "No duplicate or padded entries",
      weight: 28,
      score: duplicates === 0 ? 100 : duplicates <= 2 ? 60 : 20,
      detail:
        duplicates === 0
          ? "No duplicate skills"
          : `${duplicates} duplicate or near duplicate skill${duplicates === 1 ? "" : "s"}`,
      fix: "Remove repeated entries and variant spellings of the same tool. Keep the spelling the posting uses.",
    }),
  ]
}

function clarityChecks(shape: ResumeShape): AtsCheck[] {
  const { data } = shape
  const bullets = shape.bullets
  const pronouns = bullets.filter((bullet) => FIRST_PERSON.test(bullet)).length + (FIRST_PERSON.test(data.summary) ? 1 : 0)
  const buzzHits = BUZZWORDS.filter((phrase) => shape.allText.includes(phrase))

  const openers = bullets.map((bullet) => lower(words(bullet)[0] || "").replace(/[^a-z]/g, "")).filter(Boolean)
  const openerCounts = new Map<string, number>()
  openers.forEach((verb) => openerCounts.set(verb, (openerCounts.get(verb) || 0) + 1))
  const repeatedOpeners = Array.from(openerCounts.values()).filter((count) => count > 2).length
  const variety = openers.length ? new Set(openers).size / openers.length : 0

  const rolesWithBadBulletCount = data.experience.filter((entry, index) => {
    const count = entry.bullets.length
    return index < 3 ? count < 3 || count > 7 : count > 5
  }).length

  return [
    check({
      id: "no_first_person",
      label: "No first person pronouns",
      weight: 24,
      score: pronouns === 0 ? 100 : pronouns <= 2 ? 55 : 15,
      detail: pronouns === 0 ? "No first person pronouns found" : `${pronouns} block${pronouns === 1 ? "" : "s"} use "I", "my" or "we"`,
      fix: 'Drop the pronoun and start with the verb. "I managed a team of nine" becomes "Managed a team of nine".',
    }),
    check({
      id: "verb_variety",
      label: "Verbs are varied",
      weight: 24,
      score: openers.length < 4 ? 100 : ratioScore(variety, 0.7, 0.25) - repeatedOpeners * 5,
      detail:
        openers.length < 4
          ? "Too few bullets to measure variety"
          : `${new Set(openers).size} distinct opening verbs across ${openers.length} bullets`,
      fix: "Reuse no opening verb more than twice. Repetition makes strong work read as one flat block.",
    }),
    check({
      id: "bullet_balance",
      label: "Bullet counts are balanced across roles",
      weight: 26,
      score: data.experience.length === 0 ? 0 : ratioScore(1 - pct(rolesWithBadBulletCount, data.experience.length), 0.9, 0.3),
      detail:
        data.experience.length === 0
          ? "No roles"
          : `${rolesWithBadBulletCount} of ${data.experience.length} roles sit outside the recommended bullet count`,
      fix: "Give the three most recent roles three to seven bullets each and older roles at most five. Weight the page towards recent work.",
    }),
    check({
      id: "no_buzzwords",
      label: "No empty buzz phrases",
      weight: 26,
      score: buzzHits.length === 0 ? 100 : buzzHits.length === 1 ? 60 : 20,
      detail:
        buzzHits.length === 0
          ? "No filler phrases found"
          : `Found ${buzzHits.slice(0, 3).map((phrase) => `"${phrase}"`).join(", ")}`,
      fix: "Replace each filler phrase with the evidence behind it. Instead of a proven track record, name the result.",
    }),
  ]
}

function hygieneChecks(shape: ResumeShape): AtsCheck[] {
  const { data } = shape
  const allDates = [...data.experience, ...data.education, ...data.projects]
    .flatMap((entry) => [entry.startDate, entry.endDate])
    .filter(Boolean)
  const formats = new Set(
    allDates.map((value) => {
      const text = lower(value)
      if (/\b(present|current)\b/.test(text)) return "present"
      if (/[a-z]{3}/.test(text)) return "month-name"
      if (/[\/.-]/.test(text)) return "numeric"
      return "year-only"
    }),
  )
  formats.delete("present")

  const linkedin = data.linkedinUrl.trim()
  const linkedinValid = linkedin === "" || /linkedin\.com\/(in|company)\//i.test(linkedin)
  const placeholders = [data.summary, data.headline, ...shape.bullets].filter((value) =>
    /\b(lorem ipsum|tbd|xxx+|todo|placeholder|insert |your name here)\b/i.test(value),
  )

  return [
    check({
      id: "education_present",
      label: "Education is listed",
      weight: 30,
      score: data.education.length > 0 ? 100 : 0,
      detail:
        data.education.length > 0
          ? `${data.education.length} education entr${data.education.length === 1 ? "y" : "ies"}`
          : "No education entries",
      fix: "Add the highest qualification with institution and year. Many systems knock out a resume that has no education block at all.",
    }),
    check({
      id: "date_format_consistent",
      label: "One date format throughout",
      weight: 28,
      score: allDates.length === 0 ? 0 : formats.size <= 1 ? 100 : formats.size === 2 ? 55 : 20,
      detail:
        allDates.length === 0
          ? "No dates found"
          : formats.size <= 1
            ? "All dates use one format"
            : `${formats.size} different date formats in use`,
      fix: 'Use "Mon YYYY" everywhere, for example "Jan 2022 - Mar 2024".',
    }),
    check({
      id: "profile_link",
      label: "Profile link is present and valid",
      weight: 22,
      score: linkedin && linkedinValid ? 100 : linkedin ? 30 : 45,
      detail: !linkedin
        ? "No LinkedIn URL"
        : linkedinValid
          ? "LinkedIn URL is well formed"
          : "LinkedIn URL does not look like a profile address",
      fix: "Add the full public profile URL as plain text, for example linkedin.com/in/yourname. Do not hide it behind link text.",
    }),
    check({
      id: "no_placeholders",
      label: "No placeholder text left behind",
      weight: 20,
      score: placeholders.length === 0 ? 100 : 0,
      detail:
        placeholders.length === 0
          ? "No placeholder text found"
          : `${placeholders.length} field${placeholders.length === 1 ? "" : "s"} still contain placeholder text`,
      fix: "Replace every placeholder with the real detail before sending.",
    }),
  ]
}

// --------------------------------------------------------------------------
// Engine
// --------------------------------------------------------------------------

const factorMeta = (key: AtsFactorKey) => ATS_FACTORS.find((factor) => factor.key === key)!

const buildFactor = (key: AtsFactorKey, checks: AtsCheck[]): AtsFactorResult => {
  const meta = factorMeta(key)
  const scored = checks.filter((item) => item.state !== "na")
  const weightTotal = scored.reduce((total, item) => total + item.weight, 0)
  const score =
    weightTotal > 0 ? clampScore(scored.reduce((total, item) => total + item.score * item.weight, 0) / weightTotal) : 0

  // A check's stake is the overall points it still withholds, so the
  // suggestion list can be ordered by real impact rather than by opinion.
  checks.forEach((item) => {
    if (item.state === "na" || weightTotal === 0) return
    item.pointsAtStake = Math.round((((100 - item.score) * item.weight) / weightTotal) * (meta.weight / 100) * 10) / 10
  })

  return {
    key,
    name: meta.name,
    weight: meta.weight,
    definition: meta.definition,
    score,
    earned: Math.round(((score * meta.weight) / 100) * 10) / 10,
    checks,
  }
}

/**
 * Fallback keyword set when there is no posting to score against.
 *
 * These come from the candidate's own material plus the target role wording,
 * so the coverage number still means something without pretending to know a
 * specific employer's filter. The audit marks itself provisional in this case.
 */
function roleStandardKeywords(targetRole: string, resume: ResumeData): { keyword: string; weight: number }[] {
  const roleTerms = words(lower(targetRole))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    .map((token) => ({ keyword: normalizeTerm(token), weight: 10 }))

  const skillTerms = resume.skills
    .slice(0, 18)
    .map((skill) => ({ keyword: normalizeTerm(skill), weight: 6 }))
    .filter((item) => item.keyword.length > 1)

  const seen = new Set<string>()
  return [...roleTerms, ...skillTerms].filter((item) => {
    if (seen.has(item.keyword)) return false
    seen.add(item.keyword)
    return true
  })
}

export type ScoreResumeInput = {
  resume: ResumeData
  jobDescription?: string
  targetRole?: string
}

export function scoreResume({ resume, jobDescription = "", targetRole = "" }: ScoreResumeInput): AtsAudit {
  const shape = flatten(resume)
  const hasJd = jobDescription.trim().length >= 80

  const extracted = hasJd ? extractJobKeywords(jobDescription) : roleStandardKeywords(targetRole, resume)

  const keywords: AtsKeyword[] = extracted.map((item) => {
    const found = containsTerm(shape.allText, item.keyword)
    const inSkills = found && resume.skills.some((skill) => containsTerm(normalizeTerm(skill), item.keyword))
    const inBullets = found && containsTerm(shape.bulletText, item.keyword)
    return {
      keyword: item.keyword,
      weight: item.weight,
      found,
      where: !found ? "" : inBullets ? "experience" : inSkills ? "skills" : "profile",
    }
  })

  const factors: AtsFactorResult[] = [
    buildFactor("ats_parsing", parsingChecks(shape)),
    buildFactor("role_alignment", alignmentChecks(shape, targetRole, keywords, hasJd)),
    buildFactor("recruiter_read", recruiterReadChecks(shape)),
    buildFactor("achievement_evidence", evidenceChecks(shape)),
    buildFactor("career_progression", progressionChecks(shape)),
    buildFactor("skills_credibility", skillsChecks(shape)),
    buildFactor("clarity", clarityChecks(shape)),
    buildFactor("professional_hygiene", hygieneChecks(shape)),
  ]

  const overall = clampScore(factors.reduce((total, factor) => total + factor.earned, 0))

  const suggestions: AtsSuggestion[] = factors
    .flatMap((factor) =>
      factor.checks
        .filter((item) => item.state !== "na" && item.state !== "pass" && item.fix)
        .map((item) => ({ factor: factor.name, check: item })),
    )
    .sort((a, b) => b.check.pointsAtStake - a.check.pointsAtStake)
    .slice(0, 12)
    .map((item, index) => ({
      priority: index + 1,
      factor: item.factor,
      checkId: item.check.id,
      action: item.check.fix,
      detail: item.check.detail,
      pointsAvailable: item.check.pointsAtStake,
    }))

  const coverageWeight = keywords.reduce((total, item) => total + item.weight, 0)
  const coverageFound = keywords.filter((item) => item.found).reduce((total, item) => total + item.weight, 0)

  return {
    version: ATS_ENGINE_VERSION,
    overall,
    band: overall >= 80 ? "strong" : overall >= 60 ? "developing" : "at_risk",
    provisional: !hasJd,
    factors,
    keywords: {
      coverage: coverageWeight > 0 ? Math.round((coverageFound / coverageWeight) * 100) : 0,
      matched: keywords.filter((item) => item.found),
      missing: keywords.filter((item) => !item.found),
    },
    suggestions,
    stats: {
      words: shape.wordCount,
      bullets: shape.bullets.length,
      quantifiedBullets: shape.bullets.filter((bullet) => QUANTIFIED.test(bullet)).length,
      roles: resume.experience.length,
      estimatedPages: Math.max(1, Math.ceil(shape.wordCount / 480)),
    },
  }
}
