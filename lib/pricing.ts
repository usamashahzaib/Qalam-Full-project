export interface PricingPlan {
  plan: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  annualPrice?: string
  annualHref?: string
  annualDescription?: string
}

export const PLANS: PricingPlan[] = [
  {
    plan: "Free",
    price: "$0",
    period: "forever",
    description: "Current workspace access while commercial plan enforcement is being finalized.",
    features: [
      "LinkedIn-first sign-in",
      "Writer, archive, calendar, and analytics surfaces",
      "Voice profile settings and saved drafts",
      "Free public tools with no sign-in",
      "No credit card required",
    ],
    cta: "Start with LinkedIn ->",
    href: "/auth/sign-up",
    badge: "Live now",
  },
  {
    plan: "Pro",
    price: "$19",
    period: "mo",
    description: "Personal paid onboarding for users who want a production workspace beyond the free preview.",
    features: [
      "Assisted onboarding while checkout rollout completes",
      "LinkedIn publish flow and saved workspace history",
      "Voice profile, scheduling, and archive continuity",
      "Workspace analytics from real app events",
      "Priority support and migration help",
    ],
    cta: "Talk to Qalam ->",
    href: "/contact",
    highlighted: true,
    badge: "Assisted rollout",
    annualPrice: "$15",
    annualHref: "/contact",
    annualDescription: "Quoted annual rate during assisted rollout.",
  },
  {
    plan: "Team",
    price: "$49",
    period: "mo",
    description: "Shared internal workflow rollout for small teams. Collaboration hardening is still in progress.",
    features: [
      "Everything in Pro",
      "Manual team onboarding",
      "Shared workflow evaluation for internal operators",
      "Collaboration features rolling out in stages",
      "Best fit for guided pilots, not self-serve scale yet",
    ],
    cta: "Discuss Team Setup ->",
    href: "/contact",
    badge: "Pilot",
    annualPrice: "$39",
    annualHref: "/contact",
    annualDescription: "Quoted annual rate for guided team pilots.",
  },
  {
    plan: "Agency",
    price: "$99",
    period: "mo",
    description: "Agency workflow preview with assisted onboarding. Client isolation and approvals are still being hardened.",
    features: [
      "Everything in Team",
      "Client and team management in the current workspace preview",
      "Markdown export for agency handoff",
      "Per-client isolation and role controls still in rollout",
      "Best fit for design-partner style onboarding today",
    ],
    cta: "Discuss Agency Setup ->",
    href: "/contact",
    badge: "Preview",
    annualPrice: "$79",
    annualHref: "/contact",
    annualDescription: "Quoted annual rate for assisted agency rollout.",
  },
]

export const COMPARISON_ROWS: {
  label: string
  free: string
  pro: string
  team: string
  agency: string
}[] = [
  { label: "LinkedIn-first auth", free: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Writer + archive", free: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Voice profile settings", free: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Scheduling surface", free: "Live", pro: "Live", team: "Live", agency: "Live" },
  { label: "Workspace analytics", free: "Event-based", pro: "Event-based", team: "Event-based", agency: "Event-based" },
  { label: "Billing automation", free: "N/A", pro: "Manual", team: "Manual", agency: "Manual" },
  { label: "Team collaboration", free: "Single-user", pro: "Single-user", team: "Pilot", agency: "Pilot" },
  { label: "Client isolation", free: "N/A", pro: "N/A", team: "N/A", agency: "In rollout" },
  { label: "Approval workflow", free: "N/A", pro: "N/A", team: "In rollout", agency: "In rollout" },
  { label: "Support path", free: "Email", pro: "Priority email", team: "Guided onboarding", agency: "Guided onboarding" },
]
