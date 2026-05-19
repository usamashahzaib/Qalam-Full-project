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

/** PKR pricing - early-adopter / Pakistan market */
export const PLANS: PricingPlan[] = [
  {
    plan: "Free",
    monthlyPkr: 0,
    period: "forever",
    description: "Try Qalam with no commitment. Build your first drafts and see the AI in action.",
    features: [
      "LinkedIn sign-in",
      "AI writer - 10 drafts/month",
      "Voice profile (1 workspace)",
      "Basic analytics (event log)",
      "Community support",
    ],
    cta: "Start free",
    href: "/auth",
    badge: "No card required",
    featureStatus: "live",
  },
  {
    plan: "Solo",
    monthlyPkr: 1490,
    annualPkrPerMonth: 1190,
    period: "mo",
    description: "For individual professionals growing their LinkedIn presence. All core features, no limits.",
    features: [
      "Everything in Free",
      "Unlimited AI drafts",
      "LinkedIn publish - direct from app",
      "Carousel generation (AI slides)",
      "Post scheduling",
      "Full analytics dashboard",
      "Priority email support",
    ],
    cta: "Start Solo",
    href: "/auth",
    highlighted: true,
    badge: "Most popular",
    featureStatus: "live",
  },
  {
    plan: "Pro",
    monthlyPkr: 2990,
    annualPkrPerMonth: 2490,
    period: "mo",
    description: "For serious creators and consultants who need more AI power and workspace history.",
    features: [
      "Everything in Solo",
      "Post variants (A/B drafts)",
      "Competitor research tools",
      "Extended post history",
      "Approval workflow (send for review)",
      "Export to PDF / text",
    ],
    cta: "Start Pro",
    href: "/auth",
    badge: "Best value",
    featureStatus: "live",
  },
  {
    plan: "Team",
    monthlyPkr: 5990,
    annualPkrPerMonth: 4990,
    period: "mo",
    description: "For internal teams that need a shared workspace, approvals, and guided rollout before self-serve billing lands.",
    features: [
      "Everything in Pro",
      "Shared team workspace",
      "Role-based write and review permissions",
      "Approval queue",
      "Shared voice profile",
      "Guided onboarding",
    ],
    cta: "Talk to us",
    href: "/contact",
    badge: "Beta",
    featureStatus: "beta",
  },
  {
    plan: "Agency",
    monthlyPkr: 9990,
    annualPkrPerMonth: 7990,
    period: "mo",
    description: "For agencies operating multiple client workspaces through the current guided rollout.",
    features: [
      "Everything in Team",
      "Multiple client workspaces",
      "Client-scoped drafts, chat, and scheduling",
      "Workspace-aware approvals and publish logs",
      "Per-workspace analytics views",
      "Dedicated onboarding",
      "Commercial rollout support",
    ],
    cta: "Talk to us",
    href: "/contact",
    badge: "Early access",
    featureStatus: "beta",
  },
]

export const COMPARISON_ROWS: {
  label: string
  free: string
  solo: string
  pro: string
  team: string
  agency: string
}[] = [
  { label: "AI drafts", free: "10/month", solo: "Unlimited", pro: "Unlimited", team: "Unlimited", agency: "Unlimited" },
  { label: "LinkedIn publish", free: "-", solo: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Carousel generation", free: "-", solo: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Post scheduling", free: "-", solo: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Approvals workflow", free: "-", solo: "-", pro: "Live", team: "Live", agency: "Live" },
  { label: "Competitor research", free: "-", solo: "-", pro: "Live", team: "Live", agency: "Live" },
  { label: "Team operations", free: "1 workspace", solo: "1 workspace", pro: "1 workspace", team: "Shared workspace", agency: "Multi-workspace" },
  { label: "Client workspaces", free: "-", solo: "-", pro: "-", team: "-", agency: "Live" },
  { label: "Analytics", free: "Basic", solo: "Full", pro: "Full", team: "Full", agency: "Workspace-level" },
  { label: "Support", free: "Community", solo: "Email", pro: "Priority email", team: "Guided", agency: "Dedicated" },
  { label: "Billing", free: "Free", solo: "PKR 1,490/mo", pro: "PKR 2,990/mo", team: "PKR 5,990/mo", agency: "PKR 9,990/mo" },
]

export const formatPkr = (amount: number): string => {
  if (amount === 0) return "Free"
  return `PKR ${amount.toLocaleString("en-PK")}`
}
