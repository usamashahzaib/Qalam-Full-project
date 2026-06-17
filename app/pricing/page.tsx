import type { Metadata } from "next"
import { headers } from "next/headers"
import { PricingPageContent } from "@/components/PricingPageContent"
import { resolvePricingCurrency } from "@/lib/geo-pricing"
import { SITE_URL } from "@/lib/seo"
import { PLANS, formatPkr } from "@/lib/pricing"

const freePlan = PLANS.find((plan) => plan.plan === "Free")
const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
const proPlan = PLANS.find((plan) => plan.plan === "Pro")
const agencyPlan = PLANS.find((plan) => plan.plan === "Agency")
const freeDrafts = freePlan ? "5 AI posts per month" : "5 AI posts per month"
const soloPrice = soloPlan ? formatPkr(soloPlan.monthlyPkr) : "PKR 499"
const proPrice = proPlan ? formatPkr(proPlan.monthlyPkr) : "PKR 1,490"
const agencyPrice = agencyPlan ? formatPkr(agencyPlan.monthlyPkr) : "PKR 7,490"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    `Qalam pricing for the Pakistani market. Free plan with ${freeDrafts} - no card, no expiry. Solo at ${soloPrice}/month. Pay via JazzCash, Easypaisa, or bank transfer.`,
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing - Qalam",
    description:
      `Free plan with ${freeDrafts}. Solo at ${soloPrice}/month. Start free, upgrade anytime via JazzCash, Easypaisa, or bank transfer.`,
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Qalam",
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
        text: "Yes. Free is live and gives you access to the core workspace before you move into a guided paid rollout.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Qalam cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Qalam uses PKR-first pricing for the Pakistan market: Solo starts at ${soloPrice}/month, Pro at ${proPrice}/month, and Agency at ${agencyPrice}/month. Annual billing gives up to 4 months free.`,
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
  ],
}

export default async function PricingPage() {
  const headerStore = await headers()
  const pricingCurrency = resolvePricingCurrency(headerStore)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema).replace(/</g, "\\u003c") }} />
      <PricingPageContent pricingCurrency={pricingCurrency} />
    </>
  )
}