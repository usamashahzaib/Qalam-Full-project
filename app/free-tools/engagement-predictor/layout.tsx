import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Engagement Predictor - Free AI Tool",
  description:
    "Get an AI-powered engagement score for any LinkedIn draft before you post. Free tool - no account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/engagement-predictor` },
  openGraph: {
    title: "LinkedIn Engagement Predictor - Free AI Tool | Qalam",
    description: "Predict LinkedIn engagement before you post. AI score, breakdown, and improvement tips. Free.",
    url: `${SITE_URL}/free-tools/engagement-predictor`,
    type: "website",
  },
}

export default function EngagementPredictorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
