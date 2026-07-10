import type { Metadata } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import { PricingPageContent } from "@/components/PricingPageContent"
import { resolvePricingCurrency } from "@/lib/geo-pricing"
import { SITE_URL } from "@/lib/seo"
import { PLANS, plans, formatPkr } from "@/lib/pricing"

const freePlan = PLANS.find((plan) => plan.plan === "Free")
const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
const proPlan = PLANS.find((plan) => plan.plan === "Pro")
// Agency is hidden from the public plan cards (waitlist-only), but its real pricing data
// still belongs in FAQ copy and structured data, so it's read from the unfiltered `plans` list.
const agencyPlan = plans.find((plan) => plan.name === "Agency")
const freeDrafts = freePlan ? "5 AI posts per month" : "5 AI posts per month"
const soloPrice = soloPlan ? formatPkr(soloPlan.monthlyPkr) : "PKR 499"
const proPrice = proPlan ? formatPkr(proPlan.monthlyPkr) : "PKR 1,490"
const agencyPrice = agencyPlan ? formatPkr(agencyPlan.monthlyPrice) : "PKR 7,490"

export const metadata: Metadata = {
  title: `Qalam Pricing - AI LinkedIn Writer Plans | Free to ${proPrice}/month`,
  description:
    `Qalam pricing for the Pakistani market. Free plan with ${freeDrafts} - no card, no expiry. Solo at ${soloPrice}/month. Pro at ${proPrice}/month. Pay via JazzCash, Easypaisa, or bank transfer.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Qalam Pricing - AI LinkedIn Writer Plans",
    description:
      `Free plan with ${freeDrafts}. Solo at ${soloPrice}/month. Start free, upgrade anytime via JazzCash, Easypaisa, or bank transfer.`,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam Pricing - AI LinkedIn Writer Plans",
    description:
      `Free plan with ${freeDrafts}. Solo at ${soloPrice}/month. Start free, upgrade anytime via JazzCash, Easypaisa, or bank transfer.`,
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
        text: `Qalam uses PKR-first pricing for the Pakistan market: Solo starts at ${soloPrice}/month, Pro at ${proPrice}/month, and Agency at ${agencyPrice}/month. Annual billing gives up to 5 months free.`,
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. Free gives you ${freeDrafts} with no card and no expiry. Upgrade to paid when you're ready - activate via JazzCash, Easypaisa, or bank transfer.`,
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If your workspace is onboarded manually, cancellation terms are defined in that onboarding agreement.",
      },
    },
    {
      "@type": "Question",
      name: "Does Qalam accept JazzCash and Easypaisa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Qalam accepts JazzCash, Easypaisa, bank transfer, and international card. No need for a Visa or Mastercard.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in the Pro plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Pro at ${proPrice}/month includes 60 AI drafts, 10 carousels, voice memory training, AI Strategist chat, competitor research, post analytics, and approval workflows.`,
      },
    },
    {
      "@type": "Question",
      name: "Is Qalam useful for agencies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. The Agency plan at ${agencyPrice}/month provides isolated client workspaces, per-client voice profiles, team collaboration, and approval workflows for multi-client LinkedIn content operations.`,
      },
    },
  ],
}

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Qalam",
  description: "AI LinkedIn writing system with voice memory, hook archives, draft history, scheduling, and approval workflows.",
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
      url: `${SITE_URL}/login`,
    },
    {
      "@type": "Offer",
      name: "Solo Plan",
      price: String(soloPlan?.monthlyPkr ?? 499),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "30 AI drafts, 4 carousels, content calendar, post library.",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: String(proPlan?.monthlyPkr ?? 1490),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "60 drafts, voice memory, AI Strategist, competitor research, analytics, approvals.",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Agency Plan",
      price: String(agencyPlan?.monthlyPrice ?? 7490),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      description: "Multi-client workspaces, team collaboration, approval workflows.",
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