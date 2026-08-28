"use client"

import type { ResumeScoreBand } from "@/lib/career-resume-review"

export type ActivationWorkflow = "writer_draft_generated"
export type PaidPlanName = "Solo" | "Pro" | "Agency"

const SCORE_BANDS = ["strong", "developing", "at_risk"] as const

export type MarketingEventMap = {
  homepage_view: Record<never, never>
  homepage_primary_cta_click: { placement: "hero" | "final_cta" }
  resume_check_start: {
    placement: "inline_checker" | "homepage_checker"
    method: "upload" | "paste" | "full_checker_link"
  }
  assessment_complete: {
    assessment: "ats_resume_checker"
    score_band: "strong" | "developing" | "at_risk"
    job_description_supplied: boolean
  }
  score_card_download: {
    score_band: ResumeScoreBand
  }
  score_share_copy: {
    score_band: ResumeScoreBand
    /** False when the score was withheld from the copy for being below the public floor. */
    included_score: boolean
  }
  signup_start: {
    source: "ats_resume_checker"
    placement: "post_result_sidebar" | "post_result_summary"
  }
  ats_resume_handoff: {
    source: "ats_resume_checker"
    placement: "post_result_sidebar" | "post_result_summary"
    destination: "career_resumes"
  }
  signup_complete: {
    method: "credentials"
    verification_email_sent: boolean
  }
  activation: {
    workflow: ActivationWorkflow
    content_type: "linkedin_post"
  }
  paid_conversion: {
    plan: PaidPlanName
    confirmation: "server_confirmed"
  }
}

export type MarketingEventName = keyof MarketingEventMap
export type MarketingEventProperties<E extends MarketingEventName = MarketingEventName> = MarketingEventMap[E]

type SafeProperties = Record<string, string | number | boolean>
type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters?: SafeProperties) => void
}

const oneOf = <T extends string>(value: unknown, choices: readonly T[]): value is T =>
  typeof value === "string" && choices.includes(value as T)

const objectValue = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

/**
 * Runtime allowlists mirror MarketingEventMap. Unknown keys are never copied,
 * so short emails, names, IDs, topics, and resume fragments cannot reach GA
 * even if a future caller bypasses TypeScript.
 */
export function safeMarketingProperties(
  eventName: MarketingEventName,
  input: unknown,
): SafeProperties | null {
  const value = objectValue(input)

  switch (eventName) {
    case "homepage_view":
      return {}
    case "homepage_primary_cta_click":
      return oneOf(value.placement, ["hero", "final_cta"] as const)
        ? { placement: value.placement }
        : null
    case "resume_check_start":
      return oneOf(value.placement, ["inline_checker", "homepage_checker"] as const)
        && oneOf(value.method, ["upload", "paste", "full_checker_link"] as const)
        ? { placement: value.placement, method: value.method }
        : null
    case "score_card_download":
      return oneOf(value.score_band, SCORE_BANDS)
        ? { score_band: value.score_band }
        : null
    case "score_share_copy":
      return oneOf(value.score_band, SCORE_BANDS) && typeof value.included_score === "boolean"
        ? { score_band: value.score_band, included_score: value.included_score }
        : null
    case "assessment_complete":
      return value.assessment === "ats_resume_checker"
        && oneOf(value.score_band, ["strong", "developing", "at_risk"] as const)
        && typeof value.job_description_supplied === "boolean"
        ? {
            assessment: value.assessment,
            score_band: value.score_band,
            job_description_supplied: value.job_description_supplied,
          }
        : null
    case "signup_start":
      return value.source === "ats_resume_checker"
        && oneOf(value.placement, ["post_result_sidebar", "post_result_summary"] as const)
        ? { source: value.source, placement: value.placement }
        : null
    case "ats_resume_handoff":
      return value.source === "ats_resume_checker"
        && oneOf(value.placement, ["post_result_sidebar", "post_result_summary"] as const)
        && value.destination === "career_resumes"
        ? {
            source: value.source,
            placement: value.placement,
            destination: value.destination,
          }
        : null
    case "signup_complete":
      return value.method === "credentials" && typeof value.verification_email_sent === "boolean"
        ? { method: value.method, verification_email_sent: value.verification_email_sent }
        : null
    case "activation":
      return value.workflow === "writer_draft_generated" && value.content_type === "linkedin_post"
        ? { workflow: value.workflow, content_type: value.content_type }
        : null
    case "paid_conversion":
      return oneOf(value.plan, ["Solo", "Pro", "Agency"] as const)
        && value.confirmation === "server_confirmed"
        ? { plan: value.plan, confirmation: value.confirmation }
        : null
  }
}

/** Analytics is best effort and can never break a successful product path. */
export function trackMarketingEvent<E extends MarketingEventName>(
  eventName: E,
  parameters: MarketingEventProperties<E>,
) {
  if (typeof window === "undefined") return
  const safe = safeMarketingProperties(eventName, parameters)
  if (!safe) return
  try {
    ;(window as GtagWindow).gtag?.("event", eventName, safe)
  } catch {
    // Tag managers, consent tools, and blockers are outside the product path.
  }
}

const activatedWorkflows = new Set<ActivationWorkflow>()

/** Browser session proxy for immediate funnel reporting. Durable activation is server-owned. */
export function trackActivationOnce(
  workflow: ActivationWorkflow,
  parameters: Omit<MarketingEventMap["activation"], "workflow">,
) {
  if (typeof window === "undefined" || activatedWorkflows.has(workflow)) return

  const storageKey = `qalam:activation:${workflow}`
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      activatedWorkflows.add(workflow)
      return
    }
    window.sessionStorage.setItem(storageKey, "1")
  } catch {
    // The in-memory guard still covers the current page lifetime.
  }

  activatedWorkflows.add(workflow)
  trackMarketingEvent("activation", { workflow, ...parameters })
}

export function resetActivationGuardForTests() {
  activatedWorkflows.clear()
}
