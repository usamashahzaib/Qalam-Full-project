import type { PlanTier } from "@/types/domain"
import { SILENT_GROWTH_LIVE } from "@/lib/constants"
import { CAREER_PLAN_CONFIG, formatCareerLimit } from "@/lib/career-entitlements"

export type PlanName = "Free" | "Solo" | "Pro" | "Agency"

export type Plan = {
  name: PlanName
  monthlyPrice: number | null
  quarterlyPrice: number | null
  postsPerMonth: number | null
  draftsPerMonth: number | null
  carouselsPerMonth: number | null
  researchPerMonth: number
  voiceProfiles: number
  workspaces: number
  audience: string
  featureLead: string
  features: string[]
  cta: string
  badge: string
  comingSoon?: boolean
  hidden?: boolean
}

export type ManagedPlan = {
  name: string
  monthlyPrice: number
  originalMonthlyPrice: number
  postsPerMonth: number
  description: string
  features: string[]
  cta: string
}

export const quarterlyFraming = "1 month free"

// Master flag for the Agency plan. Flip to true once self-serve Agency
// activation is fully wired (checkout URL, workspace provisioning, team invites).
// While false, Agency is hidden from every public surface and every in-app
// upsell, and the Managed intake API rejects Agency applications.
export const AGENCY_PLAN_LIVE = false

export const plans: Plan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    quarterlyPrice: 0,
    postsPerMonth: 5,
    draftsPerMonth: 5,
    carouselsPerMonth: 1,
    researchPerMonth: 0,
    voiceProfiles: 0,
    workspaces: 1,
    audience: "Explore Qalam before paying",
    featureLead: "A complete starting point",
    features: [
      "5 AI posts + 5 hook sets/month",
      "1 carousel + 5 content scores/month",
      "Qalam LinkedIn extension + 10 smart comments/month",
      "Basic Voice Profile",
      "Career Vault",
      "1 LinkedIn positioning audit/month",
      "Free ATS checker + 1 targeted resume/month",
      "Track 10 active applications + outcomes",
      "15-item verified Evidence Vault",
      ...(SILENT_GROWTH_LIVE ? ["Silent Growth tools"] : []),
    ],
    cta: "Start Free",
    badge: "No card required",
  },
  {
    name: "Solo",
    monthlyPrice: 5,
    quarterlyPrice: 10,
    postsPerMonth: 30,
    draftsPerMonth: 30,
    carouselsPerMonth: 3,
    researchPerMonth: 0,
    voiceProfiles: 0,
    workspaces: 1,
    audience: "Publish consistently on LinkedIn",
    featureLead: "Everything in Free, plus",
    features: [
      "30 AI posts + 30 hook sets/month",
      "3 carousels + 10 content scores/month",
      "Role-aware writing + Qalam LinkedIn extension + 50 smart comments/month",
      "Plan, publish, and schedule on LinkedIn",
      "Post Library + version history",
      "Basic performance analytics",
      "5 LinkedIn audits + 5 ATS reviews/month",
      "3 targeted resumes/month",
      "1 flexible career credit/quarter",
      "Unlimited application tracking + 100 evidence items",
    ],
    cta: "Start Solo",
    badge: "Most popular",
  },
  {
    name: "Pro",
    monthlyPrice: 9,
    quarterlyPrice: 18,
    postsPerMonth: 60,
    draftsPerMonth: 60,
    carouselsPerMonth: 10,
    researchPerMonth: 5,
    voiceProfiles: 1,
    workspaces: 1,
    audience: "Build authority and career leverage",
    featureLead: "Everything in Solo, plus",
    features: [
      "60 AI posts + 10 carousels/month",
      "Trained voice + Push to 90+ improvement",
      "AI Strategist + 5 competitor research runs/month",
      "Full analytics + priority generation",
      "Approval workflow + PDF export",
      "Qalam LinkedIn extension + 150 smart comments/month",
      "20 LinkedIn positioning audits/month",
      "20 ATS reviews + 10 targeted resumes/month",
      "3 flexible career credits/quarter",
      "Outcome intelligence + featured recruiter visibility",
      "Recruiter search + career cohorts",
    ],
    cta: "Start Pro",
    badge: "Most powerful",
  },
  {
    name: "Agency",
    monthlyPrice: 19,
    quarterlyPrice: 38,
    postsPerMonth: 300,
    draftsPerMonth: 300,
    carouselsPerMonth: 50,
    researchPerMonth: 25,
    voiceProfiles: 5,
    workspaces: 5,
    audience: "Run multiple client workspaces",
    featureLead: "Everything in Pro, plus",
    features: [
      "300 posts/month across 5 workspaces",
      "50 carousels/month",
      "Competitor Research (25/month)",
      "White-label",
      "Team seats",
      "Approval Workflow",
      "Qalam LinkedIn extension + 400 smart comments/month",
      "Team Analytics",
      "100 LinkedIn positioning audits/month",
      "100 ATS resume reviews/month",
      "50 targeted resumes/month",
      "Dedicated Support",
    ],
    cta: "Apply for Agency",
    badge: "For teams",
    hidden: !AGENCY_PLAN_LIVE,
  },
]

// Plans visible on the public pricing page.
export const publicPlans: Plan[] = plans.filter((p) => !p.hidden)

export const MANAGED_PLANS: ManagedPlan[] = [
  {
    name: "Basic Management",
    monthlyPrice: 49,
    originalMonthlyPrice: 79,
    postsPerMonth: 12,
    description: "A Qalam writer turns your expertise into three approved LinkedIn posts each week.",
    features: [
      "12 expert-written posts/month",
      "Monthly discovery interview",
      "Voice brief built from your Career Vault",
      "Client approval flow",
      "1 revision per post",
      "Publishing + scheduling",
      "Monthly performance summary",
    ],
    cta: "Apply Now",
  },
  {
    name: "Premium Management",
    monthlyPrice: 79,
    originalMonthlyPrice: 129,
    postsPerMonth: 20,
    description: "Positioning, voice, content, and publishing managed as one LinkedIn growth system.",
    features: [
      "20 expert-written posts/month",
      "2 carousels/month",
      "Monthly positioning strategy",
      "Voice training + content pillars",
      "Publishing + scheduling",
      "Approval flow + 2 revisions per post",
      "Monthly analytics review",
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

export const isComingSoon = (plan: string): boolean => getPlanByName(plan).comingSoon === true

export function isFeatureAllowed(plan: string, feature: string): boolean {
  const current = getPlanByName(plan)
  if (feature === "carousel" || feature === "carousel_standard") return (current.carouselsPerMonth ?? 0) > 0
  if (feature === "voiceProfile" || feature === "basic_voice") return true
  if (feature === "voice" || feature === "voiceTraining") return current.voiceProfiles > 0
  if (feature === "research" || feature === "competitorResearch") return current.researchPerMonth > 0
  if (feature === "teamSeats") return current.name === "Agency"
  if (feature === "approvalWorkflow") return current.name === "Pro" || current.name === "Agency"
  if (feature === "basic_analytics") return current.name !== "Free"
  return current.name !== "Free"
}

export const hasFeature = isFeatureAllowed

export interface PricingPlan {
  plan: string
  monthlyUsd: number | null
  quarterlyUsd: number | null
  period: string
  description: string
  audience: string
  featureLead: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  featureStatus: "live" | "beta" | "coming_soon"
  comingSoon?: boolean
}

// Read directly rather than importing from lib/seo to keep this module free of
// marketing-content imports. Same env var, same normalisation.
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://app.byqalam.com").replace(/\/$/, "")

/** Absolute link to the in-app upgrade route, optionally pre-selecting a plan and cycle. */
export const upgradeUrl = (plan?: string, cycle?: BillingCycle): string => {
  const params = new URLSearchParams()
  if (plan) params.set("plan", plan)
  if (cycle) params.set("cycle", cycle)
  const query = params.toString()
  return `${APP_ORIGIN}/upgrade${query ? `?${query}` : ""}`
}

export const PLANS: PricingPlan[] = publicPlans.map((plan) => ({
  plan: plan.name,
  monthlyUsd: plan.monthlyPrice,
  quarterlyUsd: plan.quarterlyPrice,
  period: plan.monthlyPrice === 0 ? "forever" : plan.monthlyPrice == null ? "" : "month",
  description:
    plan.name === "Free"
      ? "Test the full career visibility loop before paying."
      : plan.name === "Solo"
        ? "Create, plan, and publish a consistent professional presence."
        : plan.name === "Pro"
          ? "Turn trained voice, data, and career signals into an operating advantage."
          : "For teams managing multiple workspaces and approvals.",
  audience: plan.audience,
  featureLead: plan.featureLead,
  features: plan.features,
  cta: plan.cta,
  // Paid plans go to the in-app upgrade route, which opens the Lemon Squeezy
  // overlay. Logged-out visitors are bounced through login with this as the
  // callback, so the plan they picked survives the round trip. Nothing paid
  // routes to /contact any more - that was sending buyers to an email form.
  href: plan.name === "Free"
    ? "/signup"
    : plan.name === "Agency"
      ? "/managed/apply?plan=Agency&type=company"
      : upgradeUrl(plan.name, "quarterly"),
  highlighted: plan.name === "Solo",
  badge: plan.badge,
  featureStatus: plan.comingSoon ? "coming_soon" : "live",
  comingSoon: plan.comingSoon,
}))

export const PLAN_PRICES: Record<string, { monthly: number; quarterly: number }> = Object.fromEntries(
  plans.map((plan) => [plan.name, { monthly: plan.monthlyPrice ?? 0, quarterly: plan.quarterlyPrice ?? 0 }])
)

export const PLAN_FEATURES: Record<string, string[]> = Object.fromEntries(
  plans.map((plan) => [plan.name, plan.features])
)

export const COMPARISON_ROWS = [
  {
    group: "Creation",
    label: "Posts per month",
    free: "5",
    solo: "30",
    pro: "60",
    agency: "60 x 5 workspaces",
  },
  {
    group: "Creation",
    label: "Carousels per month",
    free: "1",
    solo: "3",
    pro: "10",
    agency: "10 x 5 workspaces",
  },
  {
    group: "Creation",
    label: "Slides per carousel",
    free: "5",
    solo: "7",
    pro: "10",
    agency: "10",
  },
  {
    group: "Creation",
    label: "Hook generations",
    free: "5/month",
    solo: "30/month",
    pro: "60/month",
    agency: "300/month",
  },
  {
    group: "Creation",
    label: "Content score analyses",
    free: "5/month",
    solo: "10/month",
    pro: "20/month",
    agency: "100/month",
  },
  {
    group: "Creation",
    label: "AI Writer",
    free: "Basic",
    solo: "Role-Aware",
    pro: "Role-Aware + Strategist",
    agency: "Full",
  },
  {
    group: "Creation",
    label: "Voice profiles",
    free: "Basic profile",
    solo: "Basic profile",
    pro: "1 trained profile",
    agency: "5 trained profiles",
  },
  {
    group: "Creation",
    label: "Comment Generator",
    free: "10/month",
    solo: "50/month",
    pro: "150/month",
    agency: "400/month",
  },
  {
    group: "Workspace",
    label: "Personal workspace",
    free: "1",
    solo: "1",
    pro: "1",
    agency: "Included",
  },
  {
    group: "Workspace",
    label: "Client workspaces",
    free: "Not included",
    solo: "Not included",
    pro: "Not included",
    agency: "5",
  },
  {
    group: "Workspace",
    label: "Team seats",
    free: "1",
    solo: "1",
    pro: "1",
    agency: "5",
  },
  {
    group: "Publishing",
    label: "LinkedIn publishing",
    free: "Not included",
    solo: "Included",
    pro: "Included",
    agency: "Included",
  },
  {
    group: "Publishing",
    label: "Scheduling",
    free: "Not included",
    solo: "Included",
    pro: "Included",
    agency: "Included",
  },
  {
    group: "Publishing",
    label: "Approval workflow",
    free: "Not included",
    solo: "Not included",
    pro: "Included",
    agency: "Included",
  },
  {
    group: "Publishing",
    label: "PDF export",
    free: "Not included",
    solo: "Not included",
    pro: "Included",
    agency: "Included",
  },
  {
    group: "Intelligence",
    label: "Analytics",
    free: "Not included",
    solo: "Basic",
    pro: "Full",
    agency: "Full, 5 workspaces",
  },
  {
    group: "Intelligence",
    label: "Competitor research",
    free: "Not included",
    solo: "Not included",
    pro: "5/month",
    agency: "25/month",
  },
  {
    group: "Intelligence",
    label: "AI Strategist",
    free: "Not included",
    solo: "Not included",
    pro: "Included",
    agency: "Included",
  },
  ...(SILENT_GROWTH_LIVE ? [{
    group: "Intelligence",
    label: "Silent Growth tools",
    free: "Included",
    solo: "Included",
    pro: "Included",
    agency: "Included",
  }] : []),
  {
    group: "Career",
    label: "LinkedIn positioning audits",
    free: `${CAREER_PLAN_CONFIG.Free.linkedinAuditsPerMonth}/month`,
    solo: `${CAREER_PLAN_CONFIG.Solo.linkedinAuditsPerMonth}/month`,
    pro: `${CAREER_PLAN_CONFIG.Pro.linkedinAuditsPerMonth}/month`,
    agency: `${CAREER_PLAN_CONFIG.Agency.linkedinAuditsPerMonth}/month`,
  },
  {
    group: "Career",
    label: "ATS resume reviews",
    free: `${CAREER_PLAN_CONFIG.Free.atsReviewsPerMonth}/month`,
    solo: `${CAREER_PLAN_CONFIG.Solo.atsReviewsPerMonth}/month`,
    pro: `${CAREER_PLAN_CONFIG.Pro.atsReviewsPerMonth}/month`,
    agency: `${CAREER_PLAN_CONFIG.Agency.atsReviewsPerMonth}/month`,
  },
  {
    group: "Career",
    label: "JD-matched resumes",
    free: `${CAREER_PLAN_CONFIG.Free.targetedResumesPerMonth}/month`,
    solo: `${CAREER_PLAN_CONFIG.Solo.targetedResumesPerMonth}/month`,
    pro: `${CAREER_PLAN_CONFIG.Pro.targetedResumesPerMonth}/month`,
    agency: `${CAREER_PLAN_CONFIG.Agency.targetedResumesPerMonth}/month`,
  },
  {
    group: "Career",
    label: "Flexible career credits",
    free: "Not included",
    solo: "1/quarter",
    pro: "3/quarter",
    agency: "Custom",
  },
  {
    group: "Creation",
    label: "Qalam LinkedIn extension",
    free: "Included",
    solo: "Included",
    pro: "Included",
    agency: "Included",
  },
  {
    group: "Career",
    label: "Active applications",
    free: formatCareerLimit(CAREER_PLAN_CONFIG.Free.activeApplications),
    solo: formatCareerLimit(CAREER_PLAN_CONFIG.Solo.activeApplications),
    pro: formatCareerLimit(CAREER_PLAN_CONFIG.Pro.activeApplications),
    agency: formatCareerLimit(CAREER_PLAN_CONFIG.Agency.activeApplications),
  },
  {
    group: "Career",
    label: "Evidence Vault items",
    free: formatCareerLimit(CAREER_PLAN_CONFIG.Free.evidenceItems),
    solo: formatCareerLimit(CAREER_PLAN_CONFIG.Solo.evidenceItems),
    pro: formatCareerLimit(CAREER_PLAN_CONFIG.Pro.evidenceItems),
    agency: formatCareerLimit(CAREER_PLAN_CONFIG.Agency.evidenceItems),
  },
  {
    group: "Career",
    label: "Outcome intelligence",
    free: "Basic tracking",
    solo: "Full tracking",
    pro: "Advanced insights",
    agency: "Team insights",
  },
  {
    group: "Career",
    label: "Recruiter visibility",
    free: "Basic opt-in",
    solo: "Basic opt-in",
    pro: "Featured",
    agency: "Featured",
  },
  {
    group: "Price",
    label: "Quarterly price",
    free: "Free",
    solo: "$10",
    pro: "$18",
    agency: "$38",
  },
]

export const formatPrice = (amount: number | null | undefined): string => {
  if (amount == null) return "Contact Us"
  if (amount === 0) return "Free"
  return `$${amount.toLocaleString("en-US")}`
}

export const getQuarterlyMonthlyEquivalent = (quarterlyPrice: number | null | undefined): number | null =>
  quarterlyPrice == null ? null : Math.round(quarterlyPrice / 3)

// ─── Lemon Squeezy checkout ────────────────────────────────────────────────

export type BillingCycle = "monthly" | "quarterly" | "annual"
export type PurchasableBillingCycle = Exclude<BillingCycle, "annual">

// Hosted checkout links from the Lemon Squeezy store. Not secret - safe in a shared module.
export const LEMONSQUEEZY_CHECKOUT_URLS: Partial<Record<PlanName, Partial<Record<PurchasableBillingCycle, string>>>> = {
  Solo: {
    monthly: "https://byqalam.lemonsqueezy.com/checkout/buy/6c516b74-52b6-4ae9-b0f1-6c571d877839",
    // Quarterly product. Env var still overrides if set.
    quarterly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_SOLO_QUARTERLY_URL
      || "https://byqalam.lemonsqueezy.com/checkout/buy/a1e289b6-9c8b-42f5-b2ad-b9b36b7aff3b",
  },
  Pro: {
    monthly: "https://byqalam.lemonsqueezy.com/checkout/buy/f1c488db-da8a-491d-8b9f-af1ef96a63f3",
    // Quarterly product. Env var still overrides if set.
    quarterly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_QUARTERLY_URL
      || "https://byqalam.lemonsqueezy.com/checkout/buy/c3036b23-7f98-4a58-ad09-c2ddbe2483c2",
  },
}

export function getLemonSqueezyCheckoutUrl(
  planName: string,
  billingCycle: PurchasableBillingCycle,
  buyer?: { userId?: string | null; email?: string | null; checkoutToken?: string | null; discountCode?: string | null }
): string | null {
  const base = LEMONSQUEEZY_CHECKOUT_URLS[planName as PlanName]?.[billingCycle]
  if (!base) return null
  try {
    const checkout = new URL(base)
    if (checkout.protocol !== "https:" || checkout.hostname !== "byqalam.lemonsqueezy.com") return null
  } catch {
    return null
  }

  const params = new URLSearchParams()
  if (buyer?.email) params.set("checkout[email]", buyer.email)
  // checkout[custom][user_id] and checkout[email] are plain query params the buyer's
  // browser can freely edit before submitting - they are convenience pre-fills, never
  // proof of identity. checkout[custom][token] is a short-lived, server-signed token
  // (see lib/server/checkout-token.ts) minted for the caller's own authenticated
  // session; the webhook trusts ONLY this token to attribute a payment to an account.
  if (buyer?.userId) params.set("checkout[custom][user_id]", buyer.userId)
  if (buyer?.checkoutToken) params.set("checkout[custom][token]", buyer.checkoutToken)
  // Only ever set from the server's own referral lookup (checkout-token route) -
  // never accept a client-supplied discount code, or any buyer could self-apply it.
  if (buyer?.discountCode) params.set("checkout[discount_code]", buyer.discountCode)
  // Stamp plan + cycle into custom_data so the webhook can still resolve the plan on
  // renewal invoices, which do not carry a variant_id. The webhook always prefers the
  // signed variant_id when present, so this is a fallback and never an override vector.
  params.set("checkout[custom][plan_name]", planName)
  params.set("checkout[custom][billing_cycle]", billingCycle)
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

// ─── Single source of truth for plan enforcement ──────────────────────────────

export type Feature = "drafts" | "carousels" | "hooks" | "analyses"

export type PlanFeatureFlags = {
  linkedinPublish: boolean
  scheduling: boolean
  approvals: boolean
  canExport: boolean
  analyticsDepth: "none" | "basic" | "full"
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
    limits: { drafts: 5, carousels: 1, hooks: 5, analyses: 5 },
    flags: { linkedinPublish: false, scheduling: false, approvals: false, canExport: false, analyticsDepth: "none", voiceTraining: false, competitorResearch: false, clientWorkspaces: 0, seats: 1, researchRuns: 0, carouselSlides: 5 },
  },
  Solo: {
    limits: { drafts: 30, carousels: 3, hooks: 30, analyses: 10 },
    flags: { linkedinPublish: true, scheduling: true, approvals: false, canExport: false, analyticsDepth: "basic", voiceTraining: false, competitorResearch: false, clientWorkspaces: 0, seats: 1, researchRuns: 0, carouselSlides: 7 },
  },
  Pro: {
    limits: { drafts: 60, carousels: 10, hooks: 60, analyses: 20 },
    flags: { linkedinPublish: true, scheduling: true, approvals: true, canExport: true, analyticsDepth: "full", voiceTraining: true, competitorResearch: true, clientWorkspaces: 0, seats: 1, researchRuns: 5, carouselSlides: 10 },
  },
  Agency: {
    limits: { drafts: 300, carousels: 50, hooks: 300, analyses: 100 },
    flags: { linkedinPublish: true, scheduling: true, approvals: true, canExport: true, analyticsDepth: "full", voiceTraining: true, competitorResearch: true, clientWorkspaces: 5, seats: 5, researchRuns: 25, carouselSlides: 10 },
  },
}
