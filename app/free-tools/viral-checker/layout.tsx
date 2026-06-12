import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Viral Formula Checker - Free AI Tool",
  description:
    "Analyze any LinkedIn post for viral potential across 5 dimensions: hook quality, specificity, emotion, discussion value, and structure. Get a score + stronger opening. No account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/viral-checker` },
  keywords: ["LinkedIn viral post checker", "LinkedIn post analyzer", "viral score LinkedIn", "LinkedIn engagement AI tool"],
  openGraph: {
    title: "LinkedIn Viral Formula Checker - Free AI Tool",
    description: "Paste any LinkedIn post and get an instant viral score with specific improvement suggestions. No sign-in required.",
    url: `${SITE_URL}/free-tools/viral-checker`,
    type: "website",
    siteName: "Qalam",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Viral Formula Checker - Free",
    description: "Instant viral potential score for any LinkedIn post. No account required.",
    site: "@byqalam",
  },
}

export default function ViralCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
