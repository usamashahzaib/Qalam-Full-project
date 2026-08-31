import type { Metadata } from "next"
import { PricingPageContent } from "@/components/PricingPageContent"
import { SITE_URL, APP_URL } from "@/lib/seo"
import { AGENCY_PLAN_LIVE, PLANS, plans as ALL_PLANS, formatPrice } from "@/lib/pricing"
import { CAREER_PRODUCTS } from "@/lib/career-pricing"
import { isAddonSelfServe } from "@/lib/career-checkout"

const freePlan = PLANS.find((plan) => plan.plan === "Free")
const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
const proPlan = PLANS.find((plan) => plan.plan === "Pro")
const freeDrafts = freePlan?.features.find((f) => /posts?\/month/i.test(f)) || "5 posts/month"
const agencyPlan = ALL_PLANS.find((plan) => plan.name === "Agency")
const soloPrice = soloPlan ? formatPrice(soloPlan.quarterlyUsd) : "$10"
const proPrice = proPlan ? formatPrice(proPlan.quarterlyUsd) : "$18"
const agencyPrice = agencyPlan ? formatPrice(agencyPlan.quarterlyPrice) : "$38"
const liveCareerAddons = CAREER_PRODUCTS.filter((addon) => isAddonSelfServe(addon.key))

export const metadata: Metadata = {
  title: `Quarterly Pricing | Free to ${soloPrice}`,
  description:
    `Quarterly pricing. Solo is ${soloPrice} and Pro is ${proPrice} per quarter for LinkedIn optimization, content, ATS resumes, and career visibility. Purchasing-power-adjusted pricing available.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Qalam Pricing - Career Visibility Plans",
    description:
      `Free includes ${freeDrafts}. Solo is ${soloPrice} per quarter.`,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam Pricing - Career Visibility Plans",
    description:
      `Free includes ${freeDrafts}. Solo is ${soloPrice} per quarter.`,
  },
}

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
        text: `Pro at ${proPrice} per quarter includes LinkedIn optimization, 60 AI drafts, 10 carousels, voice memory, ATS resume targeting, three flexible career credits per quarter, content intelligence, analytics, and approval workflows.`,
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
            text: `Agency is ${agencyPrice} per quarter. It includes 5 isolated client workspaces, 5 trained voice profiles, team collaboration, analytics, and approval workflows.`,
          },
        }]
      : []),
  ],
}

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Qalam",
  description: "Career visibility system with saved voice context, career evidence, ATS resumes, LinkedIn workflows, and approvals.",
  image: `${SITE_URL}/icon.png`,
  url: `${SITE_URL}/pricing`,
  brand: { "@type": "Brand", name: "Qalam" },
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description: "5 AI posts per month, hook generator. No card required.",
      url: `${APP_URL}/login`,
    },
    {
      "@type": "Offer",
      name: "Solo Plan",
      price: String(soloPlan?.quarterlyUsd ?? 10),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description: "30 AI drafts, 3 carousels, content calendar, post library.",
      url: `${SITE_URL}/pricing`,
    },
    ...liveCareerAddons.map((addon) => ({
      "@type": "Offer",
      name: addon.name,
      price: String(addon.price),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description: `One ${addon.unit}, generated and saved inside Qalam.`,
      url: `${APP_URL}/login?callbackUrl=/career/add-ons`,
    })),
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: String(proPlan?.quarterlyUsd ?? 18),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description: "60 drafts, voice memory, AI Strategist, competitor research, analytics, approvals.",
      url: `${SITE_URL}/pricing`,
    },
    ...(AGENCY_PLAN_LIVE
      ? [{
          "@type": "Offer",
          name: "Agency Plan",
          price: String(agencyPlan?.quarterlyPrice ?? 38),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "5 client workspaces, 5 voice profiles, team approvals, publishing controls, and analytics.",
          url: `${SITE_URL}/pricing`,
        }]
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
