/**
 * Turns a failing audit check into concrete, applicable fixes.
 *
 * A check only says "3 of 20 bullets carry a number". That is not something a
 * candidate can act on. This module finds the exact lines behind the number,
 * offers one-click mechanical fixes where the change is safe to make in code,
 * and marks which lines need a written rewrite. Every candidate edit is scored
 * with the same engine before it is shown, so a suggestion that would not
 * move the score is never presented as one that does.
 */

import type { ResumeData } from "@/lib/career-resume"
import { lineSignals, scoreResume, termEvidenced, type AtsAudit } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"

export type FixPath =
  | { kind: "bullet"; role: number; bullet: number }
  | { kind: "summary" }
  | { kind: "headline" }

export type FixTarget = {
  id: string
  path: FixPath
  /** Where the line sits, for example "Operations Manager, Sample Foods". */
  context: string
  current: string
  /** Plain statement of what this line is missing. */
  problem: string
}

export type QuickFix = { id: string; title: string; description: string; next: ResumeData }

export type ScoreContext = { targetRole: string; jobDescription: string }

/** Checks whose points come back only through rewritten sentences. */
export const REWRITE_CHECKS = new Set([
  "quantified_results", "action_verbs", "outcome_language", "no_duty_language", "bullet_scannability",
  "no_first_person", "verb_variety", "no_buzzwords", "summary_length", "headline_present", "title_alignment",
  "keyword_coverage", "skills_target_overlap", "skills_evidenced", "seniority_alignment", "recent_role_depth",
])

/** Matches a fill-in prompt such as "[number of vendors]". */
export const PLACEHOLDER = /\[([^\]\n]{1,60})\]/g

export const hasPlaceholder = (text: string) => /\[[^\]\n]{1,60}\]/.test(text)

const MAX_TARGETS = 8

export const scoreOf = (resume: ResumeData, context: ScoreContext): AtsAudit =>
  scoreResume({ resume: normalizeResumeData(resume), targetRole: context.targetRole, jobDescription: context.jobDescription })

export function readPath(resume: ResumeData, path: FixPath): string {
  if (path.kind === "summary") return resume.summary
  if (path.kind === "headline") return resume.headline
  return resume.experience[path.role]?.bullets[path.bullet] ?? ""
}

export function writePath(resume: ResumeData, path: FixPath, text: string): ResumeData {
  if (path.kind === "summary") return { ...resume, summary: text }
  if (path.kind === "headline") return { ...resume, headline: text }
  return {
    ...resume,
    experience: resume.experience.map((entry, roleIndex) =>
      roleIndex !== path.role
        ? entry
        : { ...entry, bullets: entry.bullets.map((bullet, index) => (index === path.bullet ? text : bullet)) },
    ),
  }
}

const roleContext = (resume: ResumeData, role: number) => {
  const entry = resume.experience[role]
  return [entry?.title, entry?.organization].filter(Boolean).join(", ") || `Role ${role + 1}`
}

const bulletTargets = (resume: ResumeData, test: (text: string) => string | null): FixTarget[] =>
  resume.experience.flatMap((entry, role) =>
    entry.bullets.flatMap((text, bullet) => {
      const problem = test(text)
      return problem
        ? [{ id: `b-${role}-${bullet}`, path: { kind: "bullet", role, bullet } as FixPath, context: roleContext(resume, role), current: text, problem }]
        : []
    }),
  )

const summaryTarget = (resume: ResumeData, problem: string): FixTarget => ({
  id: "summary", path: { kind: "summary" }, context: "Professional summary", current: resume.summary, problem,
})

const headlineTarget = (resume: ResumeData, problem: string): FixTarget => ({
  id: "headline", path: { kind: "headline" }, context: "Headline", current: resume.headline, problem,
})

/** The exact lines a check is failing on, most recent role first. */
export function findFixTargets(checkId: string, resume: ResumeData, audit: AtsAudit): FixTarget[] {
  const missing = audit.keywords.missing.map((item) => item.keyword)
  let targets: FixTarget[] = []

  switch (checkId) {
    case "quantified_results":
      targets = bulletTargets(resume, (text) => (lineSignals(text).quantified ? null : "No number shows the scale or result"))
      break
    case "action_verbs":
      targets = bulletTargets(resume, (text) => (lineSignals(text).actionLed ? null : "Does not open with a past tense action verb"))
      break
    case "outcome_language":
      targets = bulletTargets(resume, (text) => (lineSignals(text).outcome ? null : "Describes an activity but not what changed because of it"))
      break
    case "no_duty_language":
      targets = bulletTargets(resume, (text) => (lineSignals(text).duty ? "Uses passive duty phrasing" : null))
      break
    case "bullet_scannability":
      targets = bulletTargets(resume, (text) => (lineSignals(text).long ? "Runs past about thirty words" : null))
      break
    case "no_first_person":
      targets = bulletTargets(resume, (text) => (lineSignals(text).pronoun ? 'Uses "I", "my" or "we"' : null))
      if (lineSignals(resume.summary).pronoun) targets.unshift(summaryTarget(resume, 'Uses "I", "my" or "we"'))
      break
    case "verb_variety": {
      const counts = new Map<string, number>()
      resume.experience.forEach((entry) => entry.bullets.forEach((text) => {
        const opener = lineSignals(text).opener
        counts.set(opener, (counts.get(opener) || 0) + 1)
      }))
      const seen = new Map<string, number>()
      targets = bulletTargets(resume, (text) => {
        const opener = lineSignals(text).opener
        const index = (seen.get(opener) || 0) + 1
        seen.set(opener, index)
        return (counts.get(opener) || 0) > 2 && index > 1 ? `Repeats the opening verb "${opener}"` : null
      })
      break
    }
    case "no_buzzwords": {
      const summaryHits = lineSignals(resume.summary).buzzwords
      if (summaryHits.length) targets.push(summaryTarget(resume, `Filler phrases: ${summaryHits.join(", ")}`))
      targets.push(...bulletTargets(resume, (text) => {
        const hits = lineSignals(text).buzzwords
        return hits.length ? `Filler phrases: ${hits.join(", ")}` : null
      }))
      break
    }
    case "summary_length":
      targets = [summaryTarget(resume, "Should be forty to eighty words with years, domain, two proof points and the target")]
      break
    case "headline_present":
    case "title_alignment":
      targets = [headlineTarget(resume, `Should name the target role${resume.headline ? "" : " (currently empty)"}`)]
      break
    case "keyword_coverage":
    case "skills_target_overlap":
    case "seniority_alignment":
      targets = [summaryTarget(resume, missing.length ? `Missing posting terms: ${missing.slice(0, 6).join(", ")}` : "Make scope and seniority explicit")]
      targets.push(...bulletTargets(resume, () => "Can carry posting terms where the work was done").filter((target) => target.path.kind === "bullet" && target.path.role === 0).slice(0, 4))
      break
    case "skills_evidenced": {
      const evidence = [resume.summary, ...resume.experience.flatMap((entry) => entry.bullets)].join(" \n ")
      const unbacked = resume.skills.filter((skill) => !termEvidenced(evidence, skill))
      targets = [summaryTarget(resume, `Skills with no supporting line: ${unbacked.slice(0, 6).join(", ")}`)]
      break
    }
    case "recent_role_depth":
      targets = bulletTargets(resume, () => "Can be expanded into more proof").filter((target) => target.path.kind === "bullet" && target.path.role === 0)
      break
  }

  return targets.filter((target) => target.current.trim() || target.path.kind !== "bullet").slice(0, MAX_TARGETS)
}

const unique = (values: string[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Fixes that are safe to make without asking the candidate for new facts.
 * Each one is only offered when it actually raises the score.
 */
export function quickFixes(checkId: string, resume: ResumeData, audit: AtsAudit, context: ScoreContext): QuickFix[] {
  const fixes: QuickFix[] = []
  const missing = audit.keywords.missing.map((item) => item.keyword)
  const evidence = [resume.summary, ...resume.experience.flatMap((entry) => entry.bullets)].join(" \n ")

  if (["title_alignment", "headline_present"].includes(checkId) && context.targetRole.trim()) {
    const topSkills = resume.skills.slice(0, 2).join(", ")
    const headline = topSkills ? `${context.targetRole.trim()} | ${topSkills}` : context.targetRole.trim()
    fixes.push({ id: "headline-role", title: "Use the target role as the headline", description: `Sets the headline to "${headline}". Your real job titles stay unchanged.`, next: { ...resume, headline } })
  }

  if (["skills_target_overlap", "keyword_coverage"].includes(checkId) && missing.length) {
    const additions = missing.filter((keyword) => keyword.split(" ").length <= 3).slice(0, 6)
    if (additions.length) {
      // Keep the posting's own spelling, so "OPEX" and "SAP" stay acronyms.
      const titled = additions.map((keyword) => {
        const match = context.jobDescription.match(new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i"))?.[0]
        const source = match || keyword
        return /[A-Z]/.test(source.slice(1)) ? source : source.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      })
      fixes.push({ id: "skills-add-missing", title: "Add missing posting terms to Skills", description: `Adds ${titled.join(", ")}. Keep only the ones you have genuinely done, and back each one with a bullet.`, next: { ...resume, skills: unique([...resume.skills, ...titled]) } })
    }
  }

  if (checkId === "skills_evidenced" || checkId === "skills_volume" || checkId === "skills_clean") {
    const backed = resume.skills.filter((skill) => termEvidenced(evidence, skill))
    if (checkId === "skills_evidenced" && backed.length >= 6 && backed.length < resume.skills.length) {
      fixes.push({ id: "skills-keep-backed", title: "Keep only skills your experience proves", description: `Removes ${resume.skills.length - backed.length} skills that no summary line or bullet supports.`, next: { ...resume, skills: backed } })
    }
    const deduped = unique(resume.skills)
    if (deduped.length < resume.skills.length) {
      fixes.push({ id: "skills-dedupe", title: "Remove duplicate skills", description: "Keeps one entry per skill.", next: { ...resume, skills: deduped } })
    }
    if (resume.skills.length > 22) {
      fixes.push({ id: "skills-trim", title: "Trim the skills list to 20", description: "Keeps the first 20 entries, which reads as focused rather than stuffed.", next: { ...resume, skills: resume.skills.slice(0, 20) } })
    }
  }

  if (["date_format_consistent", "dated_entries", "reverse_chronological", "no_duty_language", "no_first_person", "safe_characters"].includes(checkId)) {
    fixes.push({ id: "normalize", title: "Clean up formatting automatically", description: 'Rewrites dates as "Mon YYYY", orders roles newest first, strips pronoun and "responsible for" openers, and removes characters an ATS cannot read.', next: normalizeResumeData(resume) })
  }

  const before = audit.overall
  return fixes.filter((fix) => scoreOf(fix.next, context).overall > before || scoreOf(fix.next, context).rawOverall > audit.rawOverall)
}

/** A sample value used only to estimate the gain of a suggestion before its placeholders are filled. */
export const fillPlaceholdersForEstimate = (text: string) => text.replace(PLACEHOLDER, "12")

/** Worked example of the sentence shape each rewrite check expects. */
export const FIX_FORMULAS: Record<string, { formula: string; example: string }> = {
  quantified_results: { formula: "Action verb + what you did + scale + measurable result", example: "Renegotiated 18 vendor contracts, cutting annual admin spend by 14%" },
  outcome_language: { formula: "Action verb + what you did + so that + what changed", example: "Rebuilt the onboarding checklist, reducing first-week drop-outs from 6 to 1" },
  action_verbs: { formula: "Start with a past tense verb, never with a noun or a duty phrase", example: "Coordinated EOBI and PESSI registrations for 450 workers" },
  no_duty_language: { formula: 'Replace "Responsible for X" with the verb that describes what you did to X', example: "Managed 3 security vendors under monthly SLA reviews" },
  bullet_scannability: { formula: "One idea per bullet, under about thirty words", example: "Cut fuel cost 11% by rerouting transport for 3 shifts" },
  no_first_person: { formula: "Drop the pronoun and start with the verb", example: "Led a team of 9 administrators" },
  verb_variety: { formula: "No opening verb more than twice across the resume", example: "Directed, Negotiated, Streamlined, Secured" },
  no_buzzwords: { formula: "Replace the adjective with the evidence behind it", example: '"Results driven" becomes "Delivered 6 compliance audits with zero findings"' },
  summary_length: { formula: "Years + domain + two proof points + the role you are targeting, 40 to 80 words", example: "Administration manager with 9 years in manufacturing, running compliance and vendors for 1,200 staff. Cut admin OPEX 14% and kept inspections at zero findings. Targeting plant administration leadership." },
  headline_present: { formula: "Target role | Domain | Two core strengths", example: "Administration Manager | Manufacturing | Compliance & Vendor Management" },
  title_alignment: { formula: "Lead with the exact job title from the posting", example: "HR & Operations Manager | Policy, Compliance & Workforce Planning" },
  keyword_coverage: { formula: "Use the posting's own words in the line where you did that work", example: "Handled labour law compliance for 2 sites, including Factories Act inspections" },
  skills_target_overlap: { formula: "List the posting's tools and methods you genuinely use, spelled the same way", example: "Vendor Management, OPEX Budgeting, SAP" },
  skills_evidenced: { formula: "Every listed skill appears in at least one sentence of real work", example: "Built SAP purchase approval workflows for admin spend" },
  seniority_alignment: { formula: "Make scope explicit: team size, budget, sites, or region owned", example: "Oversaw a PKR 40 million admin budget across 2 plants" },
  recent_role_depth: { formula: "Give the most recent role four to six bullets of proof", example: "Add scope, a result, a process you built, and a stakeholder you managed" },
}
