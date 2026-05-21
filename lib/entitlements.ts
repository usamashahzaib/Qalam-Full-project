export type PlanTier = "Free" | "Solo" | "Pro" | "Agency Starter" | "Agency Growth"

export const PLAN_ORDER: PlanTier[] = ["Free", "Solo", "Pro", "Agency Starter", "Agency Growth"]

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  Free: 0,
  Solo: 1,
  Pro: 2,
  "Agency Starter": 3,
  "Agency Growth": 4,
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
    aiDraftsPerMonth: 5,
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
    aiDraftsPerMonth: 50,
    carouselGenerationsPerMonth: 3,
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
    aiDraftsPerMonth: "unlimited",
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
  "Agency Starter": {
    aiDraftsPerMonth: "unlimited",
    carouselGenerationsPerMonth: 20,
    researchRunsPerMonth: 15,
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

export const formatLimit = (value: number | "unlimited"): string => {
  if (value === "unlimited") return "Unlimited"
  if (value === 0) return "Not included"
  return String(value)
}

/** Returns a short human-readable summary of the most important caps for a plan */
export const getPlanSummary = (plan: string): string[] => {
  const limits = getPlanLimits(plan)
  const items: string[] = []
  if (limits.aiDraftsPerMonth === "unlimited") {
    items.push("Unlimited AI drafts")
  } else {
    items.push(`${limits.aiDraftsPerMonth} AI drafts/month`)
  }
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
