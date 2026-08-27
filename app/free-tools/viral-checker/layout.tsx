import type { Metadata } from "next"
import { buildOgImageUrl, SITE_URL } from "@/lib/seo"

const title = "LinkedIn Post Quality Checker - Free AI Tool"
const description =
  "Review any LinkedIn post across hook quality, clarity, specificity, usefulness, and discussion value. Get a score and stronger opening. No account required."
const ogImage = buildOgImageUrl(title, "Structured quality review for any post", "Free Post Checker")

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/free-tools/viral-checker` },
  keywords: ["LinkedIn post checker", "LinkedIn post analyzer", "LinkedIn content score", "LinkedIn writing review"],
  openGraph: {
    title,
    description: "Paste any LinkedIn post and get a structured quality review with specific improvement suggestions. No sign-in required.",
    url: `${SITE_URL}/free-tools/viral-checker`,
    type: "website",
    siteName: "Qalam",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Qalam LinkedIn Post Quality Checker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Post Quality Checker - Free",
    description: "Structured content quality review for any LinkedIn post. No account required.",
    images: [ogImage],
    site: "@byqalam",
  },
}

export default function ViralCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
