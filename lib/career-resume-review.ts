import { ATS_FACTORS } from "@/lib/ats-methodology"
import { toHundredPointScore } from "@/lib/free-tool-scores"
import type { AtsAudit } from "@/lib/ats-engine"

export const RESUME_REVIEW_SCORE_KEYS = [
  "ats_parsing",
  "role_alignment",
  "recruiter_read",
  "achievement_evidence",
  "career_progression",
  "skills_credibility",
  "clarity",
  "professional_hygiene",
] as const

export type ResumeReviewScoreKey = (typeof RESUME_REVIEW_SCORE_KEYS)[number]

export type ResumeScoreBand = "strong" | "developing" | "at_risk"

/**
 * Canonical banding for a readiness score. Lives beside the result shape so
 * the checker UI, the share card, and analytics all bucket a score the same
 * way - separate copies of these thresholds would drift and quietly split the
 * reporting vocabulary.
 */
export const resumeScoreBand = (score: number): ResumeScoreBand =>
  score >= 80 ? "strong" : score >= 60 ? "developing" : "at_risk"

/**
 * Lowest score Qalam will render into a shareable asset.
 *
 * A readiness score is private information about someone's job search. A
 * strong result is something people choose to show; a weak one is something
 * they would be exposed by, and a product that nudges them to publish it has
 * turned their disadvantage into its own distribution. Below this floor the
 * number never leaves the page.
 */
export const PUBLIC_SCORE_FLOOR = 70

export const isScorePubliclyShareable = (score: number): boolean =>
  score >= PUBLIC_SCORE_FLOOR

export type ResumeReviewResult = {
  overall_score: number
  scores: Record<ResumeReviewScoreKey, number>
  verdict: string
  screening_decision: string
  recruiter_read: {
    first_impression: string
    strongest_signal: string
    likely_question: string
    evidence_gap: string
  }
  risks: { severity: "high" | "medium" | "low"; issue: string; why: string }[]
  missing_keywords: { keyword: string; evidence_status: "supported" | "unclear" | "unsupported" }[]
  priority_fixes: { priority: number; section: string; action: string; example: string }[]
  rewritten_summary: string
  next_step: string
  disclaimer: string
  /**
   * The deterministic audit behind every number above.
   *
   * Present whenever the resume text could be parsed into a structure. The
   * model supplies the recruiter judgement; this supplies the score, so a
   * candidate can open any factor and see the exact checks that produced it.
   */
  audit: AtsAudit | null
  /**
   * How much of the pasted text the parser understood, 0 to 100. A low value
   * means the layout is fighting the parser, which is itself the finding.
   */
  parse_confidence: number
}

const numberScore = (value: unknown) => toHundredPointScore(value)

const text = (value: unknown, fallback = "Not enough evidence supplied.") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const list = (value: unknown) => Array.isArray(value) ? value : []

export const buildResumeReviewPrompt = (resumeText: string, jobDescription: string) => `Act as a globally respected CHRO, Talent Acquisition Director, executive recruiter, and ATS resume specialist. Evaluate only job-relevant evidence. Ignore protected characteristics and do not infer age, gender, ethnicity, religion, disability, marital status, or health.

Audit every decision angle used in a responsible first screen:
1. ATS parsing: headings, chronology, contact structure, formatting signals, keyword readability.
2. Role alignment: title, seniority, responsibilities, domain, tools, and job-description match.
3. Six-second recruiter read: identity, value proposition, recency, scope, and strongest proof.
4. Achievement evidence: action, context, scale, outcome, metrics, and credibility.
5. Career progression: tenure, promotions, expanding scope, transitions, and unexplained gaps. Do not penalize gaps without context.
6. Skills credibility: skills supported by work evidence, recency, depth, and keyword stuffing risk.
7. Clarity: concise language, repetition, grammar, hierarchy, and action-led bullets.
8. Professional hygiene: dates, consistency, links, education, certifications, and avoidable rejection risks.

Preserve truth. Never invent employers, dates, titles, qualifications, tools, metrics, achievements, or responsibilities. A keyword is supported only when the resume contains evidence for it. If no job description is supplied, score general market readiness and mark role alignment as provisional. Qalam scores are independent diagnostics, not an employer ATS score or hiring guarantee.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription || "No job description supplied. Review for general market readiness."}

Return strict JSON only. Every score must be an integer from 0 to 100:
{
  "overall_score": 0,
  "scores": {
    "ats_parsing": 0,
    "role_alignment": 0,
    "recruiter_read": 0,
    "achievement_evidence": 0,
    "career_progression": 0,
    "skills_credibility": 0,
    "clarity": 0,
    "professional_hygiene": 0
  },
  "verdict": "specific two-sentence recruiter verdict",
  "screening_decision": "Strong shortlist | Possible shortlist | Needs revision | High rejection risk",
  "recruiter_read": {
    "first_impression": "what is understood in six seconds",
    "strongest_signal": "best credible hiring signal",
    "likely_question": "first interview or screening question",
    "evidence_gap": "most important missing proof"
  },
  "risks": [{ "severity": "high", "issue": "specific risk", "why": "screening impact" }],
  "missing_keywords": [{ "keyword": "job-relevant term", "evidence_status": "supported | unclear | unsupported" }],
  "priority_fixes": [{ "priority": 1, "section": "section name", "action": "exact change", "example": "truth-preserving example or evidence needed" }],
  "rewritten_summary": "truthful summary using supplied evidence only",
  "next_step": "single highest-value action",
  "disclaimer": "Independent Qalam diagnostic, not an employer ATS result or hiring guarantee."
}`

/**
 * @param audit deterministic scores computed from the parsed resume. When it
 * is supplied it replaces the model's own numbers entirely, because a score
 * a candidate cannot audit is not a score worth publishing. The model's
 * qualitative fields are kept either way.
 */
export function normalizeResumeReview(
  value: unknown,
  audit: AtsAudit | null = null,
  parseConfidence = 0,
): ResumeReviewResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const scores = object(source.scores)
  const recruiterRead = object(source.recruiter_read)
  const modelScores = Object.fromEntries(RESUME_REVIEW_SCORE_KEYS.map((key) => [key, numberScore(scores[key])])) as Record<ResumeReviewScoreKey, number>
  const normalizedScores = audit
    ? (Object.fromEntries(audit.factors.map((factor) => [factor.key, factor.score])) as Record<ResumeReviewScoreKey, number>)
    : modelScores
  const weightedScore = audit
    ? audit.overall
    : Math.round(ATS_FACTORS.reduce((total, factor) => total + normalizedScores[factor.key] * factor.weight, 0) / 100)

  return {
    audit,
    parse_confidence: parseConfidence,
    overall_score: weightedScore,
    scores: normalizedScores,
    verdict: text(source.verdict),
    screening_decision: text(source.screening_decision, "Needs revision"),
    recruiter_read: {
      first_impression: text(recruiterRead.first_impression),
      strongest_signal: text(recruiterRead.strongest_signal),
      likely_question: text(recruiterRead.likely_question),
      evidence_gap: text(recruiterRead.evidence_gap),
    },
    risks: list(source.risks).slice(0, 8).map((item) => {
      const risk = object(item)
      const severity = risk.severity === "high" || risk.severity === "low" ? risk.severity : "medium"
      return { severity, issue: text(risk.issue), why: text(risk.why) }
    }),
    // Missing keywords come from the audit when there is one. The model's own
    // list drifts between runs and sometimes names terms the resume already
    // contains, which reads as carelessness on a paid diagnostic.
    missing_keywords: audit
      ? audit.keywords.missing.slice(0, 12).map((item) => ({ keyword: item.keyword, evidence_status: "unsupported" as const }))
      : list(source.missing_keywords).slice(0, 12).map((item) => {
          const keyword = object(item)
          const evidence = keyword.evidence_status
          const evidence_status = evidence === "supported" || evidence === "unsupported" ? evidence : "unclear"
          return { keyword: text(keyword.keyword), evidence_status }
        }),
    // Fixes are ranked by the points each one actually recovers, so the order
    // is an argument rather than an opinion.
    priority_fixes: audit
      ? audit.suggestions.slice(0, 7).map((item) => ({
          priority: item.priority,
          section: item.factor,
          action: item.action,
          example: `${item.detail}. Worth ${item.pointsAvailable} points.`,
        }))
      : list(source.priority_fixes).slice(0, 7).map((item, index) => {
          const fix = object(item)
          return { priority: index + 1, section: text(fix.section), action: text(fix.action), example: text(fix.example) }
        }),
    rewritten_summary: text(source.rewritten_summary),
    next_step: text(source.next_step),
    disclaimer: "Independent Qalam diagnostic, not an employer ATS result or hiring guarantee.",
  }
}

/**
 * Strict client-side parse of an ATS checker API response.
 *
 * `normalizeResumeReview` is deliberately lenient because it repairs model
 * JSON on the server. The browser is validating a different contract: that the
 * response really is a completed review. An error envelope or a truncated body
 * must be rejected here so it can never render as a zero-score review or emit
 * an `assessment_complete` event with a band inferred from a missing score.
 */
export function parseResumeReviewResponse(value: unknown): ResumeReviewResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  if (typeof source.error === "string") return null
  if (typeof source.overall_score !== "number" || !Number.isFinite(source.overall_score)) return null

  const scores = source.scores
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return null
  const scoreRecord = scores as Record<string, unknown>
  const everyScorePresent = RESUME_REVIEW_SCORE_KEYS.every(
    (key) => typeof scoreRecord[key] === "number" && Number.isFinite(scoreRecord[key] as number)
  )
  if (!everyScorePresent) return null

  const audit = (source.audit && typeof source.audit === "object" && !Array.isArray(source.audit)
    ? (source.audit as AtsAudit)
    : null)
  const confidence = typeof source.parse_confidence === "number" ? source.parse_confidence : 0
  return normalizeResumeReview(source, audit, confidence)
}
