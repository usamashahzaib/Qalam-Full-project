import type { Metadata } from "next"
import { ViralCheckerTool } from "@/components/tools/ViralCheckerTool"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Viral Formula Checker - Free Tool | Qalam",
  description:
    "Paste any LinkedIn post and get AI analysis of viral potential, weaknesses, and a stronger hook. No account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/viral-checker` },
  openGraph: {
    title: "LinkedIn Viral Formula Checker - Free | Qalam",
    description:
      "AI analysis of viral potential, weaknesses, and a stronger hook. No sign-in required.",
    url: `${SITE_URL}/free-tools/viral-checker`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Viral Formula Checker - Free | Qalam",
    description:
      "Instant AI analysis of any LinkedIn post. No account required.",
  },
}

export default function ViralCheckerPage() {
  return <ViralCheckerTool />
}
