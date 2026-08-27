import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { buildOgImageUrl } from "@/lib/seo"
import { NavWrapper } from "@/components/NavWrapper"
import { ContentProtection } from "@/components/providers/ContentProtection"
import { GoogleAnalytics } from "@/components/GoogleAnalytics"
import { SITE_NAME } from "@/lib/seo"
import { PLANS } from "@/lib/pricing"
import { SessionProvider } from "next-auth/react"
import { AccessibleControlNames } from "@/components/AccessibleControlNames"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

// "optional" rather than "swap". Cormorant is the display accent, and its
// italic is a high-contrast serif no system fallback matches in width. On a
// throttled connection the swap re-wrapped the hero h1 by a full line at
// 2.9s, moving everything below it and accounting for 0.1333 of a 0.14 CLS.
// With "optional" the browser uses the font when it arrives inside the first
// paint budget and otherwise keeps the fallback for that visit, so the line
// count is decided once and never changes. Repeat visits hit the cache and
// get the real face immediately.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "optional",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"

const rootOgTitle = "Qalam | LinkedIn Authority and Career Visibility OS"
const rootOgDescription =
  "Align your LinkedIn profile, professional content, ATS resumes, and target roles around one credible career story."

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"),
  title: {
    default: rootOgTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Qalam is a Career Visibility OS for LinkedIn positioning, professional content, ATS resumes, job matching, and career progression.",
  keywords: [
    "Qalam",
    "LinkedIn profile optimization",
    "LinkedIn authority",
    "career visibility",
    "ATS resume builder Pakistan",
    "job description match",
    "LinkedIn content intelligence",
    "professional positioning",
    "career progression",
    "recruiter visibility",
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
        alt: "Qalam Career Visibility OS",
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
        "Qalam is a career visibility system for LinkedIn positioning, content, ATS resumes, recruiter discovery, and career progression.",
      publisher: { "@id": `${siteUrl}/#organization` },
      offers: PLANS.filter((plan) => plan.quarterlyPkr != null).map((plan) => ({
        "@type": "Offer",
        name: plan.plan,
        price: String(plan.quarterlyPkr),
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
}: { children: React.ReactNode }) {
  // No server-side session fetch here: SessionProvider (no initial `session`
  // prop) fetches client-side on mount instead. That keeps this layout free
  // of dynamic APIs so marketing/SEO pages stay statically generated - only
  // the auth-gated app segment (app/(app)/layout.tsx) forces dynamic
  // rendering, and only it needs the PWA manifest/meta tags.
  const app = (
    <SessionProvider>
      <ContentProtection />
      <AccessibleControlNames />
      <div className="min-h-screen w-full bg-[#f7f3ea]">
        <NavWrapper>{children}</NavWrapper>
      </div>
    </SessionProvider>
  )

  return (
    <html lang="en" className={`${jakarta.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema).replace(/</g, "\\u003c") }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased" suppressHydrationWarning>
        {app}
      </body>
    </html>
  )
}
