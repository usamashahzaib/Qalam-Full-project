export type PlanTier = "Free" | "Solo" | "Pro" | "Agency" | "Agency Starter" | "Agency Growth"

export const PLAN_ORDER: PlanTier[] = ["Free", "Solo", "Pro", "Agency Starter", "Agency Growth"]

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  Free: 0,
  Solo: 1,
  Pro: 2,
  Agency: 3,
  "Agency Starter": 3,
  "Agency Growth": 4,
}

const normalizePlan = (plan: string): PlanTier => plan === "Agency" ? "Agency Starter" : plan as PlanTier

export const canAccessPlan = (userPlan: string, requiredPlan: PlanTier): boolean => {
  const userIdx = PLAN_ORDER.indexOf(normalizePlan(userPlan))
  const reqIdx = PLAN_ORDER.indexOf(normalizePlan(requiredPlan))
  return userIdx !== -1 && userIdx >= reqIdx
}

export const VALID_PLAN_NAMES: readonly string[] = PLAN_ORDER

export type PlanLimits = {
  aiDraftsPerMonth: number | "unlimited"
  carouselGenerationsPerMonth: number | "unlimited"
  researchRunsPerMonth: number | "unlimited"
  clientWorkspaces: number | "unlimited"
  seats: number | "unlimited"
  linkedinPublish: boolean
  scheduling: boolean
  approvals: boolean
  canExport: boolean
  analyticsDepth: "basic" | "full"
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  Free: {
    aiDraftsPerMonth: 10,
    carouselGenerationsPerMonth: 0,
    researchRunsPerMonth: 0,
    clientWorkspaces: 0,
    seats: 1,
    linkedinPublish: false,
    scheduling: false,
    approvals: false,
    canExport: false,
    analyticsDepth: "basic",
  },
  Solo: {
    aiDraftsPerMonth: 25,
    carouselGenerationsPerMonth: 0,
    researchRunsPerMonth: 0,
    clientWorkspaces: 0,
    seats: 1,
    linkedinPublish: true,
    scheduling: true,
    approvals: false,
    canExport: false,
    analyticsDepth: "full",
  },
  Pro: {
    aiDraftsPerMonth: 60,
    carouselGenerationsPerMonth: 10,
    researchRunsPerMonth: 5,
    clientWorkspaces: 0,
    seats: 1,
    linkedinPublish: true,
    scheduling: true,
    approvals: true,
    canExport: true,
    analyticsDepth: "full",
  },
  Agency: {
    aiDraftsPerMonth: "unlimited",
    carouselGenerationsPerMonth: 10,
    researchRunsPerMonth: 5,
    clientWorkspaces: 3,
    seats: 5,
    linkedinPublish: true,
    scheduling: true,
    approvals: true,
    canExport: true,
    analyticsDepth: "full",
  },
  "Agency Starter": {
    aiDraftsPerMonth: "unlimited",
    carouselGenerationsPerMonth: 10,
    researchRunsPerMonth: 5,
    clientWorkspaces: 3,
    seats: 5,
    linkedinPublish: true,
    scheduling: true,
    approvals: true,
    canExport: true,
    analyticsDepth: "full",
  },
  "Agency Growth": {
    aiDraftsPerMonth: "unlimited",
    carouselGenerationsPerMonth: "unlimited",
    researchRunsPerMonth: "unlimited",
    clientWorkspaces: "unlimited",
    seats: "unlimited",
    linkedinPublish: true,
    scheduling: true,
    approvals: true,
    canExport: true,
    analyticsDepth: "full",
  },
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
  const key = featureOverrideKey(feature)
  if (key && featureFlags?.[key] !== undefined) return featureFlags[key]
  return canAccessPlan(plan, requiredPlan)
}

export const formatLimit = (value: number | "unlimited"): string => {
  if (value === "unlimited") return "Unlimited"
  if (value === 0) return "Not included"
  return String(value)
}

/** Returns a short human-readable summary of the most important caps for a plan */
export const getPlanSummary = (plan: string): string[] => {
  const limits = getPlanLimits(plan)
  const items: string[] = []
  if (plan === "Free") items.push("10 drafts/month")
  else items.push(limits.aiDraftsPerMonth === "unlimited" ? "Unlimited AI drafts" : `${formatLimit(limits.aiDraftsPerMonth)} AI drafts/month`)
  if (limits.carouselGenerationsPerMonth === 0) {
    items.push("No carousel generation")
  } else if (limits.carouselGenerationsPerMonth === "unlimited") {
    items.push("Unlimited carousels")
  } else {
    items.push(`${limits.carouselGenerationsPerMonth} carousels/month`)
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
