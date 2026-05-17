import type { Metadata } from "next"
import { PricingPageContent } from "@/components/PricingPageContent"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Pricing | Qalam",
  description:
    "Qalam pricing for the live free workspace plus guided Pro, Team, and Agency onboarding paths.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing - Qalam",
    description:
      "Live free workspace access plus guided Pro, Team, and Agency onboarding paths.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Qalam",
    description:
      "Live free workspace access plus guided Pro, Team, and Agency onboarding paths.",
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
        text: "Yes. The current free experience gives you workspace access plus the public tools while commercial limits are being finalized.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Qalam cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Public pricing is $19/month for Pro, $49/month for Team, and $99/month for Agency. Today those paid paths are handled through assisted onboarding rather than self-serve checkout.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for paid plans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not as an automated billing feature today. Paid workspace evaluation is handled manually so scope and expectations stay explicit.",
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

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema) }} />
      <PricingPageContent />
    </>
  )
}
