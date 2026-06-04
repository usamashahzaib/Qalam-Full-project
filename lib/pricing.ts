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

/** PKR pricing - Pakistan market. All caps are real, not marketing. */
export const annualFraming = "4 months free"
export const annualSavingsPercent = 33

export const PLANS: PricingPlan[] = [
  {
    plan: "Free",
    monthlyPkr: 0,
    annualPkrPerMonth: 0,
    period: "forever",
    description: "For trying the writer with hard limits and no advanced workflow.",
    features: [
      "10 AI drafts per month",
      "No scheduling",
      "No voice memory",
      "No analytics",
      "No export",
      "Community support",
    ],
    cta: "Start free",
    href: "/auth",
    highlighted: false,
    badge: "No card required",
    featureStatus: "live",
  },
  {
    plan: "Solo",
    monthlyPkr: 899,
    annualPkrPerMonth: 599,
    period: "mo",
    description: "For individual professionals who need consistent publishing basics.",
    features: [
      "25 AI drafts per month",
      "Scheduling",
      "1 voice profile",
      "Basic scoring",
      "Email support",
    ],
    cta: "Get Solo",
    href: "/auth",
    highlighted: false,
    featureStatus: "live",
  },
  {
    plan: "Pro",
    monthlyPkr: 1899,
    annualPkrPerMonth: 1266,
    period: "mo",
    description: "For serious creators and consultants who need intelligence, analytics, and review workflow.",
    features: [
      "60 AI drafts per month",
      "Voice intelligence",
      "10 carousel projects per month",
      "5 competitor research runs per month",
      "Approval workflow",
      "Full analytics dashboard",
      "Export",
      "Priority support",
    ],
    cta: "Get Pro",
    href: "/auth",
    highlighted: true,
    badge: "Most popular",
    featureStatus: "live",
  },
  {
    plan: "Agency",
    monthlyPkr: 7490,
    annualPkrPerMonth: 4993,
    period: "mo",
    description: "For agencies managing multiple client workspaces with team delivery controls.",
    features: [
      "60 AI drafts per workspace",
      "5 client workspaces",
      "White-label",
      "10 team seats",
      "Shared asset library",
    ],
    cta: "Talk to us",
    href: "/contact",
    highlighted: false,
    featureStatus: "beta",
  },
]

export const COMPARISON_ROWS: {
  label: string
  free: string
  solo: string
  pro: string
  agencyStarter: string
  agencyGrowth: string
}[] = [
  { label: "AI drafts", free: "10/month", solo: "25/month", pro: "60/month", agencyStarter: "60/workspace", agencyGrowth: "-" },
  { label: "Post scheduling", free: "-", solo: "Live", pro: "Live", agencyStarter: "Live", agencyGrowth: "-" },
  { label: "Voice memory", free: "-", solo: "1 profile", pro: "Voice intelligence", agencyStarter: "Per workspace", agencyGrowth: "-" },
  { label: "Scoring", free: "-", solo: "Basic", pro: "Full", agencyStarter: "Full", agencyGrowth: "-" },
  { label: "Carousel generation", free: "-", solo: "-", pro: "10/month", agencyStarter: "10/month", agencyGrowth: "-" },
  { label: "Competitor research", free: "-", solo: "-", pro: "5 runs/month", agencyStarter: "5 runs/month", agencyGrowth: "-" },
  { label: "Approvals workflow", free: "-", solo: "-", pro: "Live", agencyStarter: "Live", agencyGrowth: "-" },
  { label: "Analytics", free: "-", solo: "-", pro: "Full", agencyStarter: "Full", agencyGrowth: "-" },
  { label: "Export", free: "-", solo: "-", pro: "Live", agencyStarter: "Live", agencyGrowth: "-" },
  { label: "Client workspaces", free: "-", solo: "-", pro: "-", agencyStarter: "5", agencyGrowth: "-" },
  { label: "Team seats", free: "1", solo: "1", pro: "1", agencyStarter: "10", agencyGrowth: "-" },
  { label: "Monthly price", free: "Rs 0", solo: "PKR 899", pro: "PKR 1,899", agencyStarter: "PKR 7,490", agencyGrowth: "-" },
]

/** Map plan names to their monthly/annual prices for use in upgrade flows */
export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  Free: { monthly: 0, annual: 0 },
  Solo: { monthly: 899, annual: 599 },
  Pro: { monthly: 1899, annual: 1266 },
  Agency: { monthly: 7490, annual: 4993 },
}

export const formatPkr = (amount: number): string => {
  if (amount === 0) return "Rs 0"
  return `PKR ${amount.toLocaleString("en-PK")}`
}

/** Feature list per plan - used by PlanGate, settings, and upgrade CTA components */
export const PLAN_FEATURES: Record<string, string[]> = {
  Free: [
    "10 AI drafts per month",
    "No scheduling",
    "No voice memory",
    "No analytics",
    "No export",
    "Community support",
  ],
  Solo: [
    "25 AI drafts per month",
    "Scheduling",
    "1 voice profile",
    "Basic scoring",
    "Email support",
  ],
  Pro: [
    "60 AI drafts per month",
    "Voice intelligence",
    "10 carousel projects per month",
    "5 competitor research runs per month",
    "Approval workflow",
    "Full analytics dashboard",
    "Export",
    "Priority support",
  ],
  Agency: [
    "60 AI drafts per workspace",
    "5 client workspaces",
    "White-label",
    "10 team seats",
    "Shared asset library",
  ],
}
