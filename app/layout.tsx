import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { buildOgImageUrl } from "@/lib/seo"
import { NavWrapper } from "@/components/NavWrapper"
import { ContentProtection } from "@/components/providers/ContentProtection"
import { PwaRegistration } from "@/components/PwaRegistration"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { AccessibleControlNames } from "@/components/AccessibleControlNames"
import { SITE_NAME } from "@/lib/seo"
import { PLANS } from "@/lib/pricing"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "optional",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"

const rootOgTitle = "Qalam | LinkedIn Publishing System With Voice Memory"
const rootOgDescription =
  "Draft, review, approve, and schedule LinkedIn posts, carousels, and comments from saved writing examples and professional context, so the output still reads as you."

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"),
  title: {
    default: rootOgTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Qalam is a LinkedIn publishing system with voice memory. Draft posts, hooks, carousels, and comments from writing examples you save, then review, approve, and schedule them. Isolated client workspaces for agencies.",
  keywords: [
    "Qalam",
    "LinkedIn publishing system",
    "LinkedIn voice profile",
    "AI LinkedIn writer",
    "LinkedIn content workflow",
    "LinkedIn post approval workflow",
    "LinkedIn scheduling",
    "LinkedIn agency client workspaces",
    "LinkedIn ghostwriting software",
    "LinkedIn carousel creator",
    "LinkedIn comment assistant",
    "LinkedIn content operations",
  ],
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: "Qalam Blog RSS" }],
    },
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
    title: rootOgTitle,
    description: rootOgDescription,
    images: [
      {
        url: buildOgImageUrl(rootOgTitle, rootOgDescription),
        width: 1200,
        height: 630,
        alt: "Qalam LinkedIn publishing system",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: rootOgTitle,
    description: rootOgDescription,
    images: [buildOgImageUrl(rootOgTitle, rootOgDescription)],
    creator: "@byqalam",
    site: "@byqalam",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/icon.png"],
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
      logo: `${siteUrl}/icon.png`,
      sameAs: [
        "https://www.linkedin.com/company/withqalam",
        "https://www.instagram.com/withqalam",
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
        "A LinkedIn publishing system with voice memory. Drafting, hooks, carousels, comments, approvals, scheduling, analytics, and isolated client workspaces, with supporting career and ATS resume tools.",
      publisher: { "@id": `${siteUrl}/#organization` },
      offers: PLANS.filter((plan) => plan.quarterlyUsd != null).map((plan) => ({
        "@type": "Offer",
        name: plan.plan,
        price: String(plan.quarterlyUsd),
        priceCurrency: "USD",
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
  const host = (headersList.get("x-forwarded-host") || headersList.get("host") || "").split(":")[0].toLowerCase()
  const pwaEnabled = host === "app.byqalam.com" || host === "localhost" || host === "127.0.0.1"

  const app = (
    <SessionProvider session={session}>
      <ContentProtection />
      <AccessibleControlNames />
      <div className="min-h-screen w-full bg-[#f7f3ea]">
        <NavWrapper>{children}</NavWrapper>
      </div>
      <PwaRegistration enabled={pwaEnabled} />
    </SessionProvider>
  )

  return (
    <html lang="en" className={`${jakarta.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        {pwaEnabled ? <link rel="manifest" href="/manifest.webmanifest" /> : null}
        {pwaEnabled ? <meta name="apple-mobile-web-app-capable" content="yes" /> : null}
        {pwaEnabled ? <meta name="apple-mobile-web-app-title" content="Qalam" /> : null}
        {pwaEnabled ? <meta name="apple-mobile-web-app-status-bar-style" content="default" /> : null}
        <GoogleAnalytics nonce={nonce} />
        {/* suppressHydrationWarning: browsers hide the nonce attribute from the
            DOM after parsing, so the client always sees "" vs the server value. */}
        <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema).replace(/</g, "\\u003c") }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased" suppressHydrationWarning>
        {app}
      </body>
    </html>
  )
}
