import type { PlanTier } from "@/types/domain"

export type PlanName = "Free" | "Solo" | "Pro" | "Agency"

export type Plan = {
  name: PlanName
  monthlyPrice: number | null
  annualPrice?: number | null
  postsPerMonth: number | null
  draftsPerMonth: number | null
  carouselsPerMonth: number | null
  researchPerMonth: number
  voiceProfiles: number
  workspaces: number
  annualSavingsLabel: string
  features: string[]
  cta: string
  badge: string
  comingSoon?: boolean
  hidden?: boolean
}

export type ManagedPlan = {
  name: string
  monthlyPrice: number
  postsPerMonth: number
  description: string
  features: string[]
  cta: string
}

export const annualFraming = "5 months free"
export const annualSavingsPercent = 42

export const plans: Plan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    postsPerMonth: 5,
    draftsPerMonth: 5,
    carouselsPerMonth: 0,
    researchPerMonth: 0,
    voiceProfiles: 0,
    workspaces: 1,
    annualSavingsLabel: "",
    features: [
      "5 posts/month",
      "Basic AI Writer",
      "Hook Generator",
      "Comment Generator (3/month)",
    ],
    cta: "Start Free",
    badge: "No card required",
  },
  {
    name: "Solo",
    monthlyPrice: 499,
    annualPrice: 3492,
    postsPerMonth: 30,
    draftsPerMonth: 30,
    carouselsPerMonth: 3,
    researchPerMonth: 0,
    voiceProfiles: 0,
    workspaces: 1,
    annualSavingsLabel: "Save PKR 2,496",
    features: [
      "30 posts/month",
      "3 carousels/month",
      "Role-Aware AI Writer",
      "Hook Generator",
      "Comment Generator (30/month)",
      "Post Library",
    ],
    cta: "Start Solo",
    badge: "Most popular",
  },
  {
    name: "Pro",
    monthlyPrice: 1490,
    annualPrice: 10430,
    postsPerMonth: 60,
    draftsPerMonth: 60,
    carouselsPerMonth: 10,
    researchPerMonth: 5,
    voiceProfiles: 1,
    workspaces: 1,
    annualSavingsLabel: "Save PKR 7,450",
    features: [
      "60 posts/month",
      "10 carousels/month",
      "Voice Training",
      "Push to 90+ quality check",
      "AI Strategist",
      "Comment Generator (60/month)",
      "Priority Queue",
      "Analytics",
    ],
    cta: "Start Pro",
    badge: "Best value",
  },
  {
    name: "Agency",
    monthlyPrice: 7490,
    annualPrice: 52430,
    postsPerMonth: null,
    draftsPerMonth: null,
    carouselsPerMonth: null,
    researchPerMonth: 0,
    voiceProfiles: 5,
    workspaces: 5,
    annualSavingsLabel: "",
    features: [
      "60 posts x 5 workspaces",
      "White-label",
      "Team seats",
      "Approval Workflow",
      "Comment Generator (300/month)",
      "Team Analytics",
      "Dedicated Support",
    ],
    cta: "Join Waitlist",
    badge: "Coming Soon",
    hidden: true,
  },
]

// Plans visible on the public pricing page - Agency is hidden until it ships
export const publicPlans: Plan[] = plans.filter((p) => !p.hidden)

export const MANAGED_PLANS: ManagedPlan[] = [
  {
    name: "Basic Management",
    monthlyPrice: 2999,
    postsPerMonth: 12,
    description: "We write and post 3x/week on your behalf. 1 revision per post.",
    features: [
      "12 posts/month",
      "Client approval flow",
      "1 revision per post",
      "Monthly report",
    ],
    cta: "Apply Now",
  },
  {
    name: "Premium Management",
    monthlyPrice: 6999,
    postsPerMonth: 20,
    description: "Full LinkedIn management - posts, carousels, voice, strategy.",
    features: [
      "20 posts/month",
      "2 carousels/month",
      "Voice training",
      "Engagement strategy",
      "Analytics report",
      "WhatsApp support",
    ],
    cta: "Apply Now",
  },
]

export const getPlanByName = (name: string): Plan =>
  plans.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? plans[0]

export const getPlanFeatures = (name: string): string[] => getPlanByName(name).features

export const getCarouselLimit = (plan: string): number => getPlanByName(plan).carouselsPerMonth ?? 0

export const getPostLimit = (plan: string): number => getPlanByName(plan).postsPerMonth ?? 0

export const canUseVoice = (plan: string): boolean => getPlanByName(plan).voiceProfiles > 0

export const getAnnualSavings = (planName: string): number => {
  const plan = getPlanByName(planName)
  if (!plan.monthlyPrice || !plan.annualPrice) return 0
  return plan.monthlyPrice * 12 - plan.annualPrice
}

export const isComingSoon = (plan: string): boolean => getPlanByName(plan).comingSoon === true

export function isFeatureAllowed(plan: string, feature: string): boolean {
  const current = getPlanByName(plan)
  if (feature === "carousel" || feature === "carousel_standard") return (current.carouselsPerMonth ?? 0) > 0
  if (feature === "voice" || feature === "voiceProfile") return current.voiceProfiles > 0
  if (feature === "research" || feature === "competitorResearch") return current.researchPerMonth > 0
  if (feature === "teamSeats") return current.name === "Agency"
  if (feature === "approvalWorkflow") return current.name === "Pro" || current.name === "Agency"
  if (feature === "basic_analytics") return current.name === "Solo" || current.name === "Pro" || current.name === "Agency"
  return current.name !== "Free"
}

export const hasFeature = isFeatureAllowed

export interface PricingPlan {
  plan: string
  monthlyPkr: number | null
  annualPkrPerMonth?: number
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  featureStatus: "live" | "beta" | "coming_soon"
  comingSoon?: boolean
}

export const PLANS: PricingPlan[] = publicPlans.map((plan) => ({
  plan: plan.name,
  monthlyPkr: plan.monthlyPrice,
  annualPkrPerMonth: plan.annualPrice != null ? Math.round(plan.annualPrice / 12) : undefined,
  period: plan.monthlyPrice === 0 ? "forever" : plan.monthlyPrice == null ? "" : "mo",
  description:
    plan.name === "Free"
      ? "Start with essential LinkedIn writing tools."
      : plan.name === "Solo"
        ? "For creators ready to publish consistently."
        : plan.name === "Pro"
          ? "For creators who need voice, strategy, analytics, and more output."
          : "For teams managing multiple workspaces and approvals.",
  features: plan.features,
  cta: plan.cta,
  href: plan.name === "Free" ? "/signup" : "/contact",
  highlighted: plan.name === "Solo",
  badge: plan.badge,
  featureStatus: plan.comingSoon ? "coming_soon" : "live",
  comingSoon: plan.comingSoon,
}))

export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = Object.fromEntries(
  plans.map((plan) => [plan.name, { monthly: plan.monthlyPrice ?? 0, annual: plan.annualPrice ?? 0 }])
)

export const PLAN_FEATURES: Record<string, string[]> = Object.fromEntries(
  plans.map((plan) => [plan.name, plan.features])
)

export const COMPARISON_ROWS = [
  {
    label: "Posts per month",
    free: "5",
    solo: "30",
    pro: "60",
    agency: "Coming Soon",
  },
  {
    label: "Carousels per month",
    free: "-",
    solo: "3",
    pro: "10",
    agency: "Coming Soon",
  },
  {
    label: "AI Writer",
    free: "Basic",
    solo: "Role-Aware",
    pro: "Role-Aware + Strategist",
    agency: "Full",
  },
  {
    label: "Voice profiles",
    free: "-",
    solo: "-",
    pro: "1",
    agency: "5",
  },
  {
    label: "Comment Generator",
    free: "3/month",
    solo: "30/month",
    pro: "60/month",
    agency: "300/month",
  },
  {
    label: "Client workspaces",
    free: "1",
    solo: "1",
    pro: "1",
    agency: "5",
  },
  {
    label: "Analytics",
    free: "-",
    solo: "-",
    pro: "Yes",
    agency: "Team Analytics",
  },
  {
    label: "Monthly price",
    free: "Free",
    solo: "PKR 499",
    pro: "PKR 1,490",
    agency: "PKR 7,490",
  },
]

export const formatPkr = (amount: number | null | undefined): string => {
  if (amount == null) return "Contact Us"
  if (amount === 0) return "Free"
  return `PKR ${amount.toLocaleString("en-PK")}`
}

// ─── Single source of truth for plan enforcement ──────────────────────────────

export type Feature = "drafts" | "carousels" | "hooks" | "analyses"

export type PlanFeatureFlags = {
  linkedinPublish: boolean
  scheduling: boolean
  approvals: boolean
  canExport: boolean
  analyticsDepth: "basic" | "full"
  voiceTraining: boolean
  competitorResearch: boolean
  clientWorkspaces: number
  seats: number
  researchRuns: number
  carouselSlides: number
}

export type PlanEnforcement = {
  limits: Record<Feature, number>
  flags: PlanFeatureFlags
}

export const PLAN_CONFIG: Record<PlanTier, PlanEnforcement> = {
  Free: {
    limits: { drafts: 5, carousels: 0, hooks: 5, analyses: 5 },
    flags: { linkedinPublish: false, scheduling: false, approvals: false, canExport: false, analyticsDepth: "basic", voiceTraining: false, competitorResearch: false, clientWorkspaces: 0, seats: 1, researchRuns: 0, carouselSlides: 0 },
  },
  Solo: {
    limits: { drafts: 30, carousels: 3, hooks: 30, analyses: 10 },
    flags: { linkedinPublish: true, scheduling: true, approvals: false, canExport: false, analyticsDepth: "full", voiceTraining: true, competitorResearch: false, clientWorkspaces: 0, seats: 1, researchRuns: 0, carouselSlides: 7 },
  },
  Pro: {
    limits: { drafts: 60, carousels: 10, hooks: 60, analyses: 20 },
    flags: { linkedinPublish: true, scheduling: true, approvals: true, canExport: true, analyticsDepth: "full", voiceTraining: true, competitorResearch: true, clientWorkspaces: 0, seats: 1, researchRuns: 5, carouselSlides: 10 },
  },
  Agency: {
    limits: { drafts: 300, carousels: 50, hooks: 300, analyses: 100 },
    flags: { linkedinPublish: true, scheduling: true, approvals: true, canExport: true, analyticsDepth: "full", voiceTraining: true, competitorResearch: true, clientWorkspaces: 3, seats: 5, researchRuns: 5, carouselSlides: 10 },
  },
}
