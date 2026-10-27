import type { Metadata } from "next"
import { PricingPageContent } from "@/components/PricingPageContent"
import { SITE_URL, APP_URL, buildPageMetadata, buildPlanOffer } from "@/lib/seo"
import { AGENCY_PLAN_LIVE, PLANS, plans as ALL_PLANS, formatPrice } from "@/lib/pricing"
import { CAREER_PRODUCTS } from "@/lib/career-pricing"
import { isAddonSelfServe } from "@/lib/career-checkout"

const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
const proPlan = PLANS.find((plan) => plan.plan === "Pro")
const agencyPlan = ALL_PLANS.find((plan) => plan.name === "Agency")
const freeDrafts = `${ALL_PLANS.find((plan) => plan.name === "Free")?.postsPerMonth ?? 5} posts/month`
const soloPrice = soloPlan ? formatPrice(soloPlan.quarterlyUsd) : "$10"
const proPrice = proPlan ? formatPrice(proPlan.quarterlyUsd) : "$18"
const agencyPrice = agencyPlan ? formatPrice(agencyPlan.quarterlyPrice) : "$38"
const liveCareerAddons = CAREER_PRODUCTS.filter((addon) => isAddonSelfServe(addon.key))

// Prices are per quarter, so the title and description say so. A bare "$10" in a
// search result reads as a monthly price.
export const metadata: Metadata = buildPageMetadata({
  title: AGENCY_PLAN_LIVE
    ? `Pricing: Solo ${soloPrice}, Pro ${proPrice}, Agency ${agencyPrice} a Quarter`
    : `Pricing: Solo ${soloPrice}, Pro ${proPrice} a Quarter`,
  description: AGENCY_PLAN_LIVE
    ? `Start free, no card needed. Solo is ${soloPrice}, Pro is ${proPrice}, and Agency is ${agencyPrice} per quarter. Each paid quarter includes one month free.`
    : `Start free, no card needed. Solo is ${soloPrice} and Pro is ${proPrice} per quarter. Each paid quarter includes one month free.`,
  path: "/pricing",
  tag: "Pricing",
})

const pricingFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is there a free plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Qalam's Free plan includes 5 AI posts per month and does not require a payment card.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Qalam cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: AGENCY_PLAN_LIVE
          ? `Qalam uses quarterly billing. Solo is ${soloPrice}, Pro is ${proPrice}, and Agency is ${agencyPrice} per quarter. Reduced pricing is available in select regions.`
          : `Qalam uses quarterly billing. Solo is ${soloPrice} per quarter and Pro is ${proPrice} per quarter. Reduced pricing is available in select regions.`,
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Free gives you ${freeDrafts} without a payment card. Upgrade when you need more capacity.`,
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paid renewals can be cancelled before the next quarter. Account access and retention follow the terms shown during checkout or assisted onboarding.",
      },
    },
    {
      "@type": "Question",
      name: "Does Qalam accept JazzCash and Easypaisa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Card checkout is available. JazzCash, Easypaisa, and bank transfer can be verified through the assisted payment workflow.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in the Pro plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Pro at ${proPrice} per quarter includes LinkedIn optimization, 60 AI drafts, 10 carousels, voice memory, ATS resume targeting, three flexible career credits per quarter, content intelligence, post performance analytics, and an optional approval step.`,
      },
    },
    {
      "@type": "Question",
      name: "Can I buy one career tool without upgrading?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Qalam offers individual software credits and discounted Application, Job-Win, Career Reset, and Executive Career Reset packs. Each output is generated and saved inside Qalam.",
      },
    },
    {
      "@type": "Question",
      name: "Does Qalam have a referral program?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. A referred customer gets 10% off their first confirmed purchase, and the referrer earns 10% commission after payment is confirmed.",
      },
    },
    ...(AGENCY_PLAN_LIVE
      ? [{
          "@type": "Question",
          name: "Is Qalam useful for agencies?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Agency is ${agencyPrice} per quarter. It includes 5 isolated client workspaces, 5 configurable voice profiles, team collaboration, per-workspace performance analytics, and an optional approval step.`,
          },
        }]
      : []),
  ],
}

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Qalam",
  description: "Exact monthly limits for every Qalam plan. LinkedIn drafting, voice profiles, carousels, comments, approvals, scheduling, and client workspaces.",
  image: `${SITE_URL}/icon.png`,
  url: `${SITE_URL}/pricing`,
  brand: { "@type": "Brand", name: "Qalam" },
  offers: [
    buildPlanOffer({
      name: "Free Plan",
      priceUsd: 0,
      description: "5 AI posts per month, hook generator. No card required.",
      url: `${APP_URL}/login`,
    }),
    buildPlanOffer({
      name: "Solo Plan",
      priceUsd: soloPlan?.quarterlyUsd ?? 10,
      billingMonths: 3,
      description: "30 AI drafts, 3 carousels, content calendar, post library.",
      url: `${SITE_URL}/pricing`,
    }),
    // One-time add-ons: no billing period.
    ...liveCareerAddons.map((addon) =>
      buildPlanOffer({
        name: addon.name,
        priceUsd: addon.price,
        description: `One ${addon.unit}, generated and saved inside Qalam.`,
        url: `${APP_URL}/login?callbackUrl=/career/add-ons`,
      })
    ),
    buildPlanOffer({
      name: "Pro Plan",
      priceUsd: proPlan?.quarterlyUsd ?? 18,
      billingMonths: 3,
      description: "60 drafts, voice memory, AI Strategist, competitor research, analytics, approvals.",
      url: `${SITE_URL}/pricing`,
    }),
    ...(AGENCY_PLAN_LIVE
      ? [
          buildPlanOffer({
            name: "Agency Plan",
            priceUsd: agencyPlan?.quarterlyPrice ?? 38,
            billingMonths: 3,
            description: "5 client workspaces, 5 voice profiles, team approvals, publishing controls, and analytics.",
            url: `${SITE_URL}/pricing`,
          }),
        ]
      : []),
  ],
}

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }} />
      <PricingPageContent />
    </>
  )
}
