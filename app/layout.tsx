import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})
import { NavWrapper } from "@/components/NavWrapper"
import GridGlowBackground from "@/components/ui/grid-glow-background"
import { ContentProtection } from "@/components/providers/ContentProtection"
import { WhatsAppButton } from "@/components/WhatsAppButton"
import { PwaRegistration } from "@/components/PwaRegistration"
import { SITE_NAME, SITE_URL } from "@/lib/seo"

const siteUrl = SITE_URL

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: "Qalam | AI LinkedIn Writing System for Professionals",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Qalam is a voice-aware LinkedIn writing system for founders, teams, consultants, and agencies. Build drafts, archive winning posts, schedule publishing, and keep reusable content memory.",
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
  ],
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    title: "Qalam | AI LinkedIn Writing System",
    description:
      "Voice-aware LinkedIn drafting, post memory, archive continuity, scheduling, and content operations in one system.",
    images: [
      {
        url: `${siteUrl}/qalam-mark.png`,
        width: 512,
        height: 512,
        alt: "Qalam logo",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qalam | AI LinkedIn Writing System",
    description:
      "Voice-aware LinkedIn drafting, archive continuity, scheduling, and publishing workflow for professionals.",
    images: [`${siteUrl}/qalam-mark.png`],
    creator: "@byqalam",
    site: "@byqalam",
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
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
        "Qalam is a voice-aware LinkedIn writing system with post memory, archive continuity, scheduling, and team workflow support.",
      publisher: { "@id": `${siteUrl}/#organization` },
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "Current workspace access while commercial plan enforcement is being finalized.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "19",
          priceCurrency: "USD",
          description: "Assisted paid onboarding for production workspaces while checkout rollout completes.",
        },
        {
          "@type": "Offer",
          name: "Team",
          price: "49",
          priceCurrency: "USD",
          description: "Guided internal team pilots while collaboration hardening is still in progress.",
        },
        {
          "@type": "Offer",
          name: "Agency",
          price: "99",
          priceCurrency: "USD",
          description: "Agency workflow preview with assisted onboarding while client isolation and approvals are being hardened.",
        },
      ],
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
        <ContentProtection />
        <WhatsAppButton />
        <GridGlowBackground
          glowColors={["#b8e6c8", "#e8d5a8", "#7abf9e"]}
          backgroundColor="#fafaf8"
          gridColor="rgba(13,74,69,0.07)"
          glowCount={12}
        >
          <NavWrapper>{children}</NavWrapper>
        </GridGlowBackground>
        <PwaRegistration />
      </body>
    </html>
  )
}
