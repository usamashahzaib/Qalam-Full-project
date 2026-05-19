import type { Metadata } from "next"
import { headers } from "next/headers"
import { PricingPageContent } from "@/components/PricingPageContent"
import { resolvePricingCurrency } from "@/lib/geo-pricing"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Pricing | Qalam",
  description:
    "PKR-first Qalam pricing for the live free workspace plus guided paid rollout while checkout is still manual.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing - Qalam",
    description:
      "Live free workspace access plus PKR-first paid plans activated through guided onboarding.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Qalam",
    description:
      "Live free workspace access plus PKR-first paid plans activated through guided onboarding.",
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
        text: "Qalam uses PKR-first market pricing: Solo starts at PKR 1,490/month, Pro at PKR 2,990/month, Team at PKR 5,990/month, and Agency at PKR 9,990/month.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free acts as the trial today. Paid access is still activated through guided onboarding rather than self-serve checkout.",
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
