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
export const PLANS: PricingPlan[] = [
  {
    plan: "Free",
    monthlyPkr: 0,
    period: "forever",
    description: "Try the real workflow. No card, no time limit - just a capped starter workspace.",
    features: [
      "5 AI drafts per month",
      "1 personal workspace",
      "Content scoring and hashtag hints",
      "Activity log (basic analytics)",
      "No LinkedIn publish or scheduling",
      "Community support",
    ],
    cta: "Start free",
    href: "/auth",
    badge: "No card required",
    featureStatus: "live",
  },
  {
    plan: "Solo",
    monthlyPkr: 1290,
    annualPkrPerMonth: 990,
    period: "mo",
    description: "For individual professionals building a consistent LinkedIn presence.",
    features: [
      "50 AI drafts per month",
      "LinkedIn publish directly from app",
      "Post scheduling and planner",
      "3 carousel projects per month",
      "Full analytics dashboard",
      "Content scoring and voice profile",
      "Priority email support",
    ],
    cta: "Get Solo",
    href: "/auth",
    highlighted: true,
    badge: "Most popular",
    featureStatus: "live",
  },
  {
    plan: "Pro",
    monthlyPkr: 2490,
    annualPkrPerMonth: 1990,
    period: "mo",
    description: "For serious creators and consultants who need full AI power and research.",
    features: [
      "Unlimited AI drafts",
      "10 carousel projects per month",
      "5 competitor research runs per month",
      "Approval workflow (send for client review)",
      "Export to PDF and text",
      "Voice intelligence and post scoring",
      "Priority support",
    ],
    cta: "Get Pro",
    href: "/auth",
    badge: "Best value",
    featureStatus: "live",
  },
  {
    plan: "Agency Starter",
    monthlyPkr: 5990,
    annualPkrPerMonth: 4990,
    period: "mo",
    description: "For small agencies operating multiple client workspaces with review and publish control.",
    features: [
      "Everything in Pro",
      "3 client workspaces",
      "Up to 5 team seats",
      "Per-workspace approvals and publish logs",
      "Shared voice profiles",
      "Guided agency onboarding",
      "WhatsApp support",
    ],
    cta: "Talk to us",
    href: "/contact",
    badge: "Agency",
    featureStatus: "beta",
  },
  {
    plan: "Agency Growth",
    monthlyPkr: 9990,
    annualPkrPerMonth: 7990,
    period: "mo",
    description: "For agencies managing many clients with full workspace isolation and team scale.",
    features: [
      "Everything in Agency Starter",
      "Unlimited client workspaces",
      "Unlimited team seats",
      "Workspace-level analytics",
      "Per-client billing scope",
      "Commercial rollout support",
      "Priority WhatsApp support",
    ],
    cta: "Talk to us",
    href: "/contact",
    badge: "Scale",
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
  { label: "AI drafts", free: "5/month", solo: "50/month", pro: "Unlimited", agencyStarter: "Unlimited", agencyGrowth: "Unlimited" },
  { label: "LinkedIn publish", free: "-", solo: "Live", pro: "Live", agencyStarter: "Live", agencyGrowth: "Live" },
  { label: "Post scheduling", free: "-", solo: "Live", pro: "Live", agencyStarter: "Live", agencyGrowth: "Live" },
  { label: "Carousel generation", free: "-", solo: "3/month", pro: "10/month", agencyStarter: "20/month", agencyGrowth: "Unlimited" },
  { label: "Competitor research", free: "-", solo: "-", pro: "5 runs/month", agencyStarter: "15 runs/month", agencyGrowth: "Unlimited" },
  { label: "Approvals workflow", free: "-", solo: "-", pro: "Live", agencyStarter: "Live", agencyGrowth: "Live" },
  { label: "Client workspaces", free: "-", solo: "-", pro: "-", agencyStarter: "3", agencyGrowth: "Unlimited" },
  { label: "Team seats", free: "1", solo: "1", pro: "1", agencyStarter: "5", agencyGrowth: "Unlimited" },
  { label: "Analytics", free: "Basic", solo: "Full", pro: "Full", agencyStarter: "Full", agencyGrowth: "Workspace-level" },
  { label: "Support", free: "Community", solo: "Email", pro: "Priority email", agencyStarter: "WhatsApp", agencyGrowth: "Priority WhatsApp" },
  { label: "Monthly price", free: "Free", solo: "PKR 1,290", pro: "PKR 2,490", agencyStarter: "PKR 5,990", agencyGrowth: "PKR 9,990" },
]

/** Map plan names to their monthly/annual prices for use in upgrade flows */
export const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  Free: { monthly: 0, annual: 0 },
  Solo: { monthly: 1290, annual: 990 },
  Pro: { monthly: 2490, annual: 1990 },
  "Agency Starter": { monthly: 5990, annual: 4990 },
  "Agency Growth": { monthly: 9990, annual: 7990 },
}

export const formatPkr = (amount: number): string => {
  if (amount === 0) return "Free"
  return `PKR ${amount.toLocaleString("en-PK")}`
}
