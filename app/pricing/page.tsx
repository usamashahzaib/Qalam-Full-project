import type { Metadata } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import { PricingPageContent } from "@/components/PricingPageContent"
import { resolvePricingCurrency } from "@/lib/geo-pricing"
import { SITE_URL, APP_URL } from "@/lib/seo"
import { PLANS, formatPkr } from "@/lib/pricing"

const freePlan = PLANS.find((plan) => plan.plan === "Free")
const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
const proPlan = PLANS.find((plan) => plan.plan === "Pro")
const freeDrafts = freePlan?.features.find((f) => /posts?\/month/i.test(f)) || "5 posts/month"
const agencyPlan = PLANS.find((plan) => plan.plan === "Agency")
const soloPrice = soloPlan ? formatPkr(soloPlan.monthlyPkr) : "PKR 799"
const proPrice = proPlan ? formatPkr(proPlan.monthlyPkr) : "PKR 1,499"
const agencyPrice = agencyPlan ? formatPkr(agencyPlan.monthlyPkr) : "PKR 3,999"

export const metadata: Metadata = {
  title: `Qalam Pricing | Free to ${soloPrice}/month`,
  description:
    `Pakistan-first career visibility pricing. Solo at ${soloPrice}/month and Pro at ${proPrice}/month, billed quarterly with 1 month free. LinkedIn optimization, ATS resumes, content intelligence, and publishing in one system.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Qalam Pricing - AI LinkedIn Writer Plans",
    description:
      `Free plan with ${freeDrafts}. Solo at ${soloPrice}/month, billed quarterly with 1 month free.`,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam Pricing - AI LinkedIn Writer Plans",
    description:
      `Free plan with ${freeDrafts}. Solo at ${soloPrice}/month, billed quarterly with 1 month free.`,
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
        text: "Yes. Qalam's Free plan is PKR 0 forever with 5 AI posts per month and no credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Qalam cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Qalam uses Pakistan-first quarterly billing. Solo is ${soloPrice} per month, Pro is ${proPrice} per month, and Agency is ${agencyPrice} per month. Every quarterly payment includes 1 month free.`,
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. Free gives you ${freeDrafts} with no card and no expiry. Upgrade whenever you are ready - card checkout unlocks the plan straight away.`,
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Paid plans can be cancelled - your workspace and drafts stay accessible on the Free tier, and you never lose your content history. If your workspace is onboarded manually, cancellation terms are defined in that onboarding agreement instead.",
      },
    },
    {
      "@type": "Question",
      name: "Does Qalam accept JazzCash and Easypaisa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Card checkout is the fastest route and unlocks your plan instantly. If you would rather pay by JazzCash, Easypaisa, or bank transfer, send us the payment screenshot and we activate your plan manually, normally within 24 hours.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in the Pro plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Pro at ${proPrice}/month includes LinkedIn optimization, 60 AI drafts, 10 carousels, voice memory, ATS resume targeting, post intelligence, analytics, and approval workflows. It is billed quarterly with 1 month free.`,
      },
    },
    {
      "@type": "Question",
      name: "Is Qalam useful for agencies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Agency is ${agencyPrice}/month, billed quarterly. It includes 5 isolated client workspaces, 5 trained voice profiles, team collaboration, analytics, and approval workflows.`,
      },
    },
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
    {
      "@type": "Offer",
      name: "Agency Plan",
      price: String(agencyPlan?.quarterlyPkr ?? 7998),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "5 client workspaces, 5 voice profiles, team approvals, publishing controls, and analytics.",
      url: `${SITE_URL}/pricing`,
    },
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
