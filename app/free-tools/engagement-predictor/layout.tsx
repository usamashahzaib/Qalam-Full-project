import type { Metadata } from "next"
import { buildOgImageUrl, SITE_URL } from "@/lib/seo"

const title = "LinkedIn Engagement Predictor - Free AI Tool"
const description =
  "Predict LinkedIn post engagement before publishing. AI scores your draft across hook quality, specificity, audience relevance, and discussion value - with specific edits to improve your reach. No account required."
const ogImage = buildOgImageUrl(title, "Pre-publish engagement score for any draft", "Free Engagement Predictor")

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/free-tools/engagement-predictor` },
  keywords: ["LinkedIn engagement predictor", "LinkedIn post score", "AI LinkedIn tool", "predict LinkedIn reach"],
  openGraph: {
    title,
    description: "Know if your LinkedIn post will engage before you hit publish. AI prediction with specific improvements. No sign-in required.",
    url: `${SITE_URL}/free-tools/engagement-predictor`,
    type: "website",
    siteName: "Qalam",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Qalam LinkedIn Engagement Predictor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Engagement Predictor - Free",
    description: "Pre-publish engagement score for any LinkedIn draft. No account required.",
    images: [ogImage],
    site: "@byqalam",
  },
}

export default function EngagementPredictorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
