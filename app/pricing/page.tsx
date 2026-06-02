import type { Metadata } from "next"
import { headers } from "next/headers"
import { PricingPageContent } from "@/components/PricingPageContent"
import { resolvePricingCurrency } from "@/lib/geo-pricing"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Pricing | Qalam",
  description:
    "Qalam pricing for the Pakistani market. Free plan with 10 AI drafts — no card, no expiry. Solo at PKR 499/month. Pay via JazzCash, Easypaisa, or bank transfer.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing - Qalam",
    description:
      "Free plan with 10 AI drafts. Solo at PKR 499/month. Start free, upgrade anytime via JazzCash, Easypaisa, or bank transfer.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Qalam",
    description:
      "Free plan with 10 AI drafts. Solo at PKR 499/month. Start free, upgrade anytime via JazzCash, Easypaisa, or bank transfer.",
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
        text: "Qalam uses PKR-first pricing for the Pakistan market: Solo starts at PKR 499/month, Pro at PKR 990/month, Agency Starter at PKR 2,490/month, and Agency Growth at PKR 4,990/month. Annual billing saves 20%.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Free gives you 10 AI drafts per month with no card and no expiry. Upgrade to paid when you're ready — activate via JazzCash, Easypaisa, or bank transfer.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema) }} />
      <PricingPageContent pricingCurrency={pricingCurrency} />
    </>
  )
}
