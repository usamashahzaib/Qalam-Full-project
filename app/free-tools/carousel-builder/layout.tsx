import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Carousel Builder - Free Tool",
  description:
    "Turn any post or outline into a multi-slide LinkedIn carousel. Export as PNG ZIP. Free - no account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/carousel-builder` },
  openGraph: {
    title: "LinkedIn Carousel Builder - Free Tool | Qalam",
    description: "Build and export LinkedIn carousel slides from any content. Free PNG export. No sign-in needed.",
    url: `${SITE_URL}/free-tools/carousel-builder`,
    type: "website",
  },
}

export default function CarouselBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
