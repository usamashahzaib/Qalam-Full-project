import type { Metadata } from "next"
import { ProfileOptimizerTool } from "@/components/tools/ProfileOptimizerTool"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Profile Optimizer - Free Tool | Qalam",
  description:
    "Answer 10 questions about your LinkedIn profile and get an instant score with specific, prioritized improvements. No sign-in required.",
  alternates: { canonical: `${SITE_URL}/free-tools/profile-optimizer` },
  openGraph: {
    title: "LinkedIn Profile Optimizer - Free | Qalam",
    description:
      "10-question LinkedIn profile audit with an instant score and actionable improvement plan. No account required.",
    url: `${SITE_URL}/free-tools/profile-optimizer`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Profile Optimizer - Free | Qalam",
    description:
      "Instant LinkedIn profile score with prioritized improvements. No account required.",
  },
}

export default function ProfileOptimizerPage() {
  return <ProfileOptimizerTool />
}
