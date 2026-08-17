import type { PlanTier } from "@/types/domain"

export type CareerEntitlements = {
  linkedinAuditsPerMonth: number
  atsReviewsPerMonth: number
  targetedResumesPerMonth: number
  activeApplications: number | "unlimited"
  evidenceItems: number | "unlimited"
  outcomeTracking: boolean
  advancedOutcomeInsights: boolean
  recruiterVisibility: "basic" | "featured"
  recruiterSearch: boolean
  cohortTools: boolean
}

export const CAREER_PLAN_CONFIG: Record<PlanTier, CareerEntitlements> = {
  Free: {
    linkedinAuditsPerMonth: 1,
    atsReviewsPerMonth: 1,
    targetedResumesPerMonth: 1,
    activeApplications: 10,
    evidenceItems: 15,
    outcomeTracking: true,
    advancedOutcomeInsights: false,
    recruiterVisibility: "basic",
    recruiterSearch: false,
    cohortTools: false,
  },
  Solo: {
    linkedinAuditsPerMonth: 5,
    atsReviewsPerMonth: 5,
    targetedResumesPerMonth: 3,
    activeApplications: "unlimited",
    evidenceItems: 100,
    outcomeTracking: true,
    advancedOutcomeInsights: false,
    recruiterVisibility: "basic",
    recruiterSearch: false,
    cohortTools: false,
  },
  Pro: {
    linkedinAuditsPerMonth: 20,
    atsReviewsPerMonth: 20,
    targetedResumesPerMonth: 10,
    activeApplications: "unlimited",
    evidenceItems: "unlimited",
    outcomeTracking: true,
    advancedOutcomeInsights: true,
    recruiterVisibility: "featured",
    recruiterSearch: true,
    cohortTools: true,
  },
  Agency: {
    linkedinAuditsPerMonth: 100,
    atsReviewsPerMonth: 100,
    targetedResumesPerMonth: 50,
    activeApplications: "unlimited",
    evidenceItems: "unlimited",
    outcomeTracking: true,
    advancedOutcomeInsights: true,
    recruiterVisibility: "featured",
    recruiterSearch: true,
    cohortTools: true,
  },
}

export const getCareerEntitlements = (plan: string): CareerEntitlements =>
  CAREER_PLAN_CONFIG[plan as PlanTier] ?? CAREER_PLAN_CONFIG.Free

export const formatCareerLimit = (value: number | "unlimited") =>
  value === "unlimited" ? "Unlimited" : String(value)
