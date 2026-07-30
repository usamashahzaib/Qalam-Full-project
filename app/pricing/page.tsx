import type { Metadata } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import { PricingPageContent } from "@/components/PricingPageContent"
import { resolvePricingCurrency } from "@/lib/geo-pricing"
import { SITE_URL, APP_URL } from "@/lib/seo"
import { AGENCY_PLAN_LIVE, PLANS, plans as ALL_PLANS, formatPkr } from "@/lib/pricing"

const freePlan = PLANS.find((plan) => plan.plan === "Free")
const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
const proPlan = PLANS.find((plan) => plan.plan === "Pro")
const freeDrafts = freePlan?.features.find((f) => /posts?\/month/i.test(f)) || "5 posts/month"
const agencyPlan = ALL_PLANS.find((plan) => plan.name === "Agency")
const soloPrice = soloPlan ? formatPkr(soloPlan.quarterlyPkr) : "PKR 1,598"
const proPrice = proPlan ? formatPkr(proPlan.quarterlyPkr) : "PKR 2,998"
const agencyPrice = agencyPlan ? formatPkr(agencyPlan.quarterlyPrice) : "PKR 7,998"

export const metadata: Metadata = {
  title: `Quarterly Pricing | Free to ${soloPrice}`,
  description:
    `Pakistan-first quarterly pricing. Solo is ${soloPrice} and Pro is ${proPrice} per quarter for LinkedIn optimization, content, ATS resumes, and career visibility.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Qalam Pricing - AI LinkedIn Writer Plans",
    description:
      `Free includes ${freeDrafts}. Solo is ${soloPrice} per quarter.`,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam Pricing - AI LinkedIn Writer Plans",
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
          ? `Qalam uses Pakistan-first quarterly billing. Solo is ${soloPrice}, Pro is ${proPrice}, and Agency is ${agencyPrice} per quarter.`
          : `Qalam uses Pakistan-first quarterly billing. Solo is ${soloPrice} per quarter and Pro is ${proPrice} per quarter.`,
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
        text: `Pro at ${proPrice} per quarter includes LinkedIn optimization, 60 AI drafts, 10 carousels, voice memory, ATS resume targeting, content intelligence, analytics, and approval workflows.`,
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
  description: "AI LinkedIn writing system with voice memory, hook archives, draft history, scheduling, and approval workflows.",
  image: `${SITE_URL}/icon.png`,
  url: `${SITE_URL}/pricing`,
  brand: { "@type": "Brand", name: "Qalam" },
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "5 AI posts per month, hook generator. No card required.",
      url: `${APP_URL}/login`,
    },
    {
      "@type": "Offer",
      name: "Solo Plan",
      price: String(soloPlan?.quarterlyPkr ?? 1598),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "30 AI drafts, 3 carousels, content calendar, post library.",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: String(proPlan?.quarterlyPkr ?? 2998),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "60 drafts, voice memory, AI Strategist, competitor research, analytics, approvals.",
      url: `${SITE_URL}/pricing`,
    },
    ...(AGENCY_PLAN_LIVE
      ? [{
          "@type": "Offer",
          name: "Agency Plan",
          price: String(agencyPlan?.quarterlyPrice ?? 7998),
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
          description: "5 client workspaces, 5 voice profiles, team approvals, publishing controls, and analytics.",
          url: `${SITE_URL}/pricing`,
        }]
      : []),
  ],
}

export default async function PricingPage() {
  const headerStore = await headers()
  const pricingCurrency = resolvePricingCurrency(headerStore)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }} />
      <Suspense fallback={null}>
        <PricingPageContent pricingCurrency={pricingCurrency} />
      </Suspense>
    </>
  )
}
