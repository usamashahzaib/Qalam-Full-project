import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { buildOgImageUrl } from "@/lib/seo"
import { NavWrapper } from "@/components/NavWrapper"
import GridGlowBackground from "@/components/ui/grid-glow-background"
import { ContentProtection } from "@/components/providers/ContentProtection"
import { PwaRegistration } from "@/components/PwaRegistration"
import { SITE_NAME } from "@/lib/seo"
import { PLANS } from "@/lib/pricing"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"

const rootOgTitle = "Qalam - AI LinkedIn Writer & Post Generator with Voice Memory"
const rootOgDescription =
  "Qalam is the AI writing tool that learns your voice. Write LinkedIn posts that sound like you - not generic AI. Voice memory, drafts, scheduling, and publishing in one workspace."

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"),
  manifest: "/manifest.webmanifest",
  title: {
    default: rootOgTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Qalam is the AI writer that learns your voice. Create LinkedIn posts, hooks, and carousels that sound exactly like you - not generic AI output. Voice memory, drafts, scheduling, and publishing in one workspace. Free to start.",
  keywords: [
    "Qalam",
    "Qalam AI",
    "Qalam writer",
    "Qalam LinkedIn",
    "AI writer",
    "AI writing tool",
    "AI content writer",
    "LinkedIn AI writer",
    "LinkedIn post generator",
    "LinkedIn content creator",
    "AI LinkedIn posts",
    "LinkedIn writing assistant",
    "LinkedIn ghostwriter AI",
    "voice AI writer",
    "AI with memory",
    "personal brand AI tool",
    "LinkedIn hook generator",
    "LinkedIn headline optimizer",
    "LinkedIn carousel maker",
    "LinkedIn scheduler AI",
    "founder content tool",
    "consultant LinkedIn tool",
    "agency LinkedIn workflow",
    "HR LinkedIn content",
    "best AI for LinkedIn",
    "LinkedIn content system",
    "AI writing workspace",
    "content archive software",
    "brand voice AI",
    "AI copywriting tool",
    "LinkedIn post writer",
    "LinkedIn scheduler",
    "agency content workflow",
    "auth",
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
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/blog?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#app`,
      name: SITE_NAME,
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Qalam is an AI writer and LinkedIn publishing workspace with draft generation, voice memory, scheduling, approvals, archive continuity, and direct publishing. The AI writing tool that learns your voice over time.",
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

export default async function RootLayout({
  children,
}: { children: React.ReactNode }) {
  const [session, headersList] = await Promise.all([auth(), headers()])
  const nonce = headersList.get("x-nonce") ?? undefined

  const app = (
    <SessionProvider session={session}>
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
    </SessionProvider>
  )

  return (
    <html lang="en" className={`${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema).replace(/</g, "\\u003c") }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased" suppressHydrationWarning>
        {app}
      </body>
    </html>
  )
}
