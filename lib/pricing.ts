export type PlanName = "Free" | "Pro" | "Agency"

export type Plan = {
  name: PlanName
  monthlyPrice: number
  annualPrice?: number
  draftsPerMonth: number
  carouselsPerMonth: number
  researchPerMonth: number
  voiceProfiles: number
  workspaces: number
  features: string[]
  cta: string
  badge: string
}

export const annualFraming = "5 months free"
export const annualSavingsPercent = 42

export const plans: Plan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    draftsPerMonth: 10,
    carouselsPerMonth: 2,
    researchPerMonth: 0,
    voiceProfiles: 0,
    workspaces: 1,
    features: ["Basic AI Writer", "Hook Generator", "2 Carousel Templates"],
    cta: "Start Free",
    badge: "No card required",
  },
  {
    name: "Pro",
    monthlyPrice: 990,
    annualPrice: 6930,
    draftsPerMonth: 60,
    carouselsPerMonth: 10,
    researchPerMonth: 5,
    voiceProfiles: 1,
    workspaces: 1,
    features: ["AI Writer", "10 Carousel Templates", "Voice Training", "AI Strategist", "Priority Queue", "Analytics"],
    cta: "Get Pro",
    badge: "Best value",
  },
  {
    name: "Agency",
    monthlyPrice: 4990,
    annualPrice: 34930,
    draftsPerMonth: 300,
    carouselsPerMonth: 50,
    researchPerMonth: 25,
    voiceProfiles: 5,
    workspaces: 5,
    features: ["Everything in Pro", "5 Workspaces", "Approval Workflow", "Team Analytics"],
    cta: "Get Agency",
    badge: "For teams",
  },
]

export const getPlanByName = (name: string) => plans.find((p) => p.name.toLowerCase() === name.toLowerCase()) || plans[0]
export const getPlanFeatures = (name: string) => getPlanByName(name).features
export const getCarouselLimit = (plan: string) => getPlanByName(plan).carouselsPerMonth
export const canUseVoice = (plan: string) => getPlanByName(plan).voiceProfiles > 0
export const getAnnualSavings = (planName: string) => {
  const plan = getPlanByName(planName)
  return plan.annualPrice ? plan.monthlyPrice * 12 - plan.annualPrice : 0
}

export function isFeatureAllowed(plan: string, feature: string) {
  const current = getPlanByName(plan)
  if (feature === "carousel") return current.carouselsPerMonth > 0
  if (feature === "voice" || feature === "voiceProfile") return current.voiceProfiles > 0
  if (feature === "research" || feature === "competitorResearch") return current.researchPerMonth > 0
  if (feature === "approvalWorkflow" || feature === "teamSeats") return current.name === "Agency"
  return current.name !== "Free"
}

export const hasFeature = isFeatureAllowed

export interface PricingPlan {
  plan: string
  monthlyPkr: number
  annualPkrPerMonth?: number
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  featureStatus: "live" | "beta" | "coming_soon"
}

export const PLANS: PricingPlan[] = plans.map((plan) => ({
  plan: plan.name,
  monthlyPkr: plan.monthlyPrice,
  annualPkrPerMonth: plan.annualPrice ? Math.round(plan.annualPrice / 12) : undefined,
  period: plan.monthlyPrice === 0 ? "forever" : "mo",
  description:
    plan.name === "Free"
      ? "Start with essential LinkedIn writing tools."
      : plan.name === "Pro"
        ? "For creators who need voice, strategy, analytics, and more output."
        : "For teams managing multiple workspaces and approvals.",
  features: plan.features,
  cta: plan.cta,
  href: plan.name === "Agency" ? "/contact" : "/login",
  highlighted: plan.name === "Pro",
  badge: plan.badge,
  featureStatus: plan.name === "Agency" ? "beta" : "live",
}))

export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = Object.fromEntries(
  plans.map((plan) => [plan.name, { monthly: plan.monthlyPrice, annual: plan.annualPrice || 0 }])
)

export const PLAN_FEATURES: Record<string, string[]> = Object.fromEntries(plans.map((plan) => [plan.name, plan.features]))

export const COMPARISON_ROWS = [
  { label: "AI drafts", free: "10/month", solo: "-", pro: "60/month", agencyStarter: "300/month", agencyGrowth: "-" },
  { label: "Voice profiles", free: "-", solo: "-", pro: "1", agencyStarter: "5", agencyGrowth: "-" },
  { label: "Carousel generation", free: "2/month", solo: "-", pro: "10/month", agencyStarter: "50/month", agencyGrowth: "-" },
  { label: "Research", free: "-", solo: "-", pro: "5/month", agencyStarter: "25/month", agencyGrowth: "-" },
  { label: "Client workspaces", free: "1", solo: "-", pro: "1", agencyStarter: "5", agencyGrowth: "-" },
  { label: "Monthly price", free: "Free", solo: "-", pro: "PKR 990", agencyStarter: "PKR 4,990", agencyGrowth: "-" },
]

export const formatPkr = (amount: number) => (amount === 0 ? "Free" : `PKR ${amount.toLocaleString("en-PK")}`)
