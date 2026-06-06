import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { buildOgImageUrl } from "@/lib/seo"
import { NavWrapper } from "@/components/NavWrapper"
import GridGlowBackground from "@/components/ui/grid-glow-background"
import { ContentProtection } from "@/components/providers/ContentProtection"
import { PwaRegistration } from "@/components/PwaRegistration"
import { SITE_NAME } from "@/lib/seo"
import { PLANS } from "@/lib/pricing"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"

const rootOgTitle = "Qalam | AI LinkedIn Writer with Voice Memory, Scheduling and Publishing"
const rootOgDescription =
  "Write LinkedIn posts in your real voice. Qalam stores your drafts, edits, voice profile, scheduling flow, approvals, and LinkedIn publishing in one workspace."

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"),
  manifest: "/manifest.webmanifest",
  title: {
    default: rootOgTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "AI LinkedIn writing workspace with voice memory, drafts, scheduling, approvals, hashtags, reply assistance, carousels, and publishing in one system.",
  keywords: [
    "Qalam",
    "LinkedIn writing tool",
    "AI LinkedIn post generator",
    "LinkedIn content system",
    "voice profile writing AI",
    "LinkedIn post writer",
    "LinkedIn scheduler",
    "agency content workflow",
    "brand voice AI",
    "content archive software",
    "AI LinkedIn content creator",
    "LinkedIn AI assistant",
    "LinkedIn publishing tool",
    "best AI tool for LinkedIn",
  ],
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.BING_SITE_VERIFICATION || "",
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    title: "Qalam | AI LinkedIn Writer with Voice Memory",
    description: rootOgDescription,
    images: [
      {
        url: buildOgImageUrl(rootOgTitle, rootOgDescription),
        width: 1200,
        height: 630,
        alt: "Qalam - AI LinkedIn writer with voice memory",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam | AI LinkedIn Writer with Voice Memory",
    description: rootOgDescription,
    images: [buildOgImageUrl(rootOgTitle, rootOgDescription)],
    creator: "@byqalam",
    site: "@byqalam",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "3200x3200" },
    ],
    shortcut: ["/qalam-mark.png"],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
  appleWebApp: {
    capable: true,
    title: "Qalam",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d4a45",
}

const appSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: SITE_NAME,
      url: siteUrl,
      logo: `${siteUrl}/qalam-mark.png`,
      sameAs: [
        "https://www.linkedin.com/company/byqalam",
        "https://www.instagram.com/byyqalam",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: SITE_NAME,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#app`,
      name: SITE_NAME,
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Qalam is an AI LinkedIn writing workspace with draft generation, voice memory, scheduling, approvals, archive continuity, and direct publishing.",
      publisher: { "@id": `${siteUrl}/#organization` },
      offers: PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.plan,
        price: String(plan.monthlyPkr),
        priceCurrency: "PKR",
        description: plan.description,
        availability:
          plan.featureStatus === "coming_soon"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
      })),
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <ClerkProvider>
          <ContentProtection />
          <GridGlowBackground
            glowColors={["#b8e6c8", "#e8d5a8", "#7abf9e"]}
            backgroundColor="#fafaf8"
            gridColor="rgba(13,74,69,0.07)"
            glowCount={12}
          >
            <NavWrapper>{children}</NavWrapper>
          </GridGlowBackground>
          <PwaRegistration />
        </ClerkProvider>
      </body>
    </html>
  )
}
