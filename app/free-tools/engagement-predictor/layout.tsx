import type { Metadata } from "next"
import { buildOgImageUrl, SITE_URL } from "@/lib/seo"

const title = "LinkedIn Post Readiness Review - Free AI Tool"
const description =
  "Review a LinkedIn post before publishing across hook quality, specificity, audience relevance, and discussion value. Get specific edits without fake reach predictions."
const ogImage = buildOgImageUrl(title, "Pre-publish quality review for any draft", "Free Post Review")

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/free-tools/engagement-predictor` },
  keywords: ["LinkedIn post review", "LinkedIn post score", "AI LinkedIn tool", "LinkedIn content readiness"],
  openGraph: {
    title,
    description: "Review the quality of your LinkedIn post before publishing. Get specific improvements without unsupported reach claims.",
    url: `${SITE_URL}/free-tools/engagement-predictor`,
    type: "website",
    siteName: "Qalam",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Qalam LinkedIn Post Readiness Review" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Post Readiness Review - Free",
    description: "Pre-publish quality score for any LinkedIn draft. No account required.",
    images: [ogImage],
    site: "@byqalam",
  },
}

export default function EngagementPredictorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
