import type { Metadata } from "next"
import { buildOgImageUrl, SITE_URL } from "@/lib/seo"

const title = "LinkedIn Viral Formula Checker - Free AI Tool"
const description =
  "Analyze any LinkedIn post for viral potential across 5 dimensions: hook quality, specificity, emotion, discussion value, and structure. Get a score + stronger opening. No account required."
const ogImage = buildOgImageUrl(title, "Instant viral score for any post", "Free Viral Checker")

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/free-tools/viral-checker` },
  keywords: ["LinkedIn viral post checker", "LinkedIn post analyzer", "viral score LinkedIn", "LinkedIn engagement AI tool"],
  openGraph: {
    title,
    description: "Paste any LinkedIn post and get an instant viral score with specific improvement suggestions. No sign-in required.",
    url: `${SITE_URL}/free-tools/viral-checker`,
    type: "website",
    siteName: "Qalam",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Qalam LinkedIn Viral Formula Checker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Viral Formula Checker - Free",
    description: "Instant viral potential score for any LinkedIn post. No account required.",
    images: [ogImage],
    site: "@byqalam",
  },
}

export default function ViralCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
