import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Viral Formula Checker - Free LinkedIn Post Analyzer",
  description:
    "Paste any LinkedIn post and get an AI viral score, breakdown, and a stronger rewritten hook. Free tool - no account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/viral-checker` },
  openGraph: {
    title: "Viral Formula Checker - Free LinkedIn Post Analyzer | Qalam",
    description: "AI viral score, weaknesses, and a stronger hook for any LinkedIn post. Free. No sign-in.",
    url: `${SITE_URL}/free-tools/viral-checker`,
    type: "website",
  },
}

export default function ViralCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
