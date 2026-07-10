import type { PlanTier } from "@/types/domain"
import { PLAN_CONFIG } from "@/lib/pricing"
export type { PlanTier }

export const PLAN_ORDER: PlanTier[] = ["Free", "Solo", "Pro", "Agency"]

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  Free: 0,
  Solo: 1,
  Pro: 2,
  Agency: 3,
}

export const canAccessPlan = (userPlan: string, requiredPlan: PlanTier): boolean => {
  const userIdx = PLAN_ORDER.indexOf(userPlan as PlanTier)
  const reqIdx = PLAN_ORDER.indexOf(requiredPlan)
  return userIdx !== -1 && userIdx >= reqIdx
}

export const VALID_PLAN_NAMES: readonly string[] = PLAN_ORDER

export type PlanLimits = {
  aiDraftsPerMonth: number | "unlimited"
  carouselGenerationsPerMonth: number | "unlimited"
  carouselSlides: number
  researchRunsPerMonth: number | "unlimited"
  clientWorkspaces: number | "unlimited"
  seats: number | "unlimited"
  linkedinPublish: boolean
  scheduling: boolean
  approvals: boolean
  canExport: boolean
  analyticsDepth: "basic" | "full"
  voiceTraining: boolean
  commentGenerationsPerMonth: number | "unlimited"
}

const derivePlanLimits = (tier: PlanTier): PlanLimits => {
  const { limits, flags } = PLAN_CONFIG[tier]
  return {
    aiDraftsPerMonth: limits.drafts,
    carouselGenerationsPerMonth: limits.carousels,
    carouselSlides: flags.carouselSlides,
    researchRunsPerMonth: flags.researchRuns,
    clientWorkspaces: flags.clientWorkspaces,
    seats: flags.seats,
    linkedinPublish: flags.linkedinPublish,
    scheduling: flags.scheduling,
    approvals: flags.approvals,
    canExport: flags.canExport,
    analyticsDepth: flags.analyticsDepth,
    voiceTraining: flags.voiceTraining,
    commentGenerationsPerMonth: tier === "Free" ? 3 : limits.hooks,
  }
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  Free: derivePlanLimits("Free"),
  Solo: derivePlanLimits("Solo"),
  Pro: derivePlanLimits("Pro"),
  Agency: derivePlanLimits("Agency"),
}

export const getPlanLimits = (plan: string): PlanLimits =>
  PLAN_LIMITS[plan as PlanTier] ?? PLAN_LIMITS.Free

export const getEffectivePlanLimits = (plan: string, overrideLimits?: PlanLimits): PlanLimits =>
  overrideLimits ?? getPlanLimits(plan)

export const featureOverrideKey = (feature: string) => {
  const normalized = feature.toLowerCase()
  if (normalized.includes("schedul") || normalized.includes("planner")) return "scheduling"
  if (normalized.includes("voice")) return "voiceProfiles"
  if (normalized.includes("analytic")) return "analytics"
  if (normalized.includes("carousel")) return "carouselBuilder"
  if (normalized.includes("competitor") || normalized.includes("research")) return "competitorResearch"
  if (normalized.includes("approval")) return "approvalWorkflow"
  if (normalized.includes("export") || normalized.includes("pdf")) return "exportPdf"
  if (normalized.includes("white")) return "whiteLabel"
  return ""
}

export const hasFeatureAccess = (
  plan: string,
  requiredPlan: PlanTier,
  feature: string,
  featureFlags?: Record<string, boolean>
) => {
  // Plan level always wins - featureFlags can only GRANT access below plan tier, never DENY it above
  if (canAccessPlan(plan, requiredPlan)) return true
  const key = featureOverrideKey(feature)
  return Boolean(key && featureFlags?.[key] === true)
}

export const formatLimit = (value: number | "unlimited"): string => {
  if (value === "unlimited") return "Unlimited"
  if (value === 0) return "Not included"
  return String(value)
}

export const getPlanSummary = (plan: string): string[] => {
  const limits = getPlanLimits(plan)
  const items: string[] = []
  if (plan === "Free") items.push("5 posts/month")
  else items.push(limits.aiDraftsPerMonth === "unlimited" ? "Unlimited posts" : `${formatLimit(limits.aiDraftsPerMonth)} posts/month`)
  if (limits.carouselGenerationsPerMonth === 0) {
    items.push("No carousel generation")
  } else if (limits.carouselGenerationsPerMonth === "unlimited") {
    items.push("Unlimited carousels")
  } else {
    items.push(`${limits.carouselGenerationsPerMonth} carousel${limits.carouselGenerationsPerMonth > 1 ? "s" : ""}/month`)
  }
  if (limits.linkedinPublish) items.push("LinkedIn publish")
  if (limits.scheduling) items.push("Post scheduling")
  if (limits.approvals) items.push("Approval workflow")
  if (typeof limits.clientWorkspaces === "number" && limits.clientWorkspaces > 0) {
    items.push(`${limits.clientWorkspaces} client workspace${limits.clientWorkspaces > 1 ? "s" : ""}`)
  } else if (limits.clientWorkspaces === "unlimited") {
    items.push("Unlimited client workspaces")
  }
  return items
}
