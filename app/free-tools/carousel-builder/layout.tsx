import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Carousel Builder - Free AI Tool",
  description:
    "Turn any LinkedIn post into a professional carousel in seconds. Paste your content, AI structures the slides, customize with your name and branding, then export as a ready-to-post PNG ZIP. No account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/carousel-builder` },
  keywords: ["LinkedIn carousel builder", "LinkedIn carousel maker", "free LinkedIn carousel tool", "LinkedIn slides generator"],
  openGraph: {
    title: "LinkedIn Carousel Builder - Free AI Tool",
    description: "Paste content, get a branded carousel. AI-structured slides, customizable, exported as PNG. No sign-in required.",
    url: `${SITE_URL}/free-tools/carousel-builder`,
    type: "website",
    siteName: "Qalam",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Carousel Builder - Free",
    description: "Turn any post into a branded LinkedIn carousel. Export as PNG ZIP. No account required.",
    site: "@byqalam",
  },
}

export default function CarouselBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
