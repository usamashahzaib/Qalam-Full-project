import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { NavWrapper } from "@/components/NavWrapper"
import GridGlowBackground from "@/components/ui/grid-glow-background"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com"),
  title: {
    default: "ByQalam — AI Writing Assistant for Professionals",
    template: "%s | ByQalam",
  },
  description:
    "ByQalam learns your voice and helps you write LinkedIn and professional content faster — without sounding generic. Built for creators and teams in Pakistan and beyond.",
  keywords: [
    "AI LinkedIn post generator",
    "LinkedIn content AI tool",
    "LinkedIn post writer",
    "Voice Fingerprint AI writing",
    "LinkedIn content creation",
    "AI writing assistant",
    "LinkedIn growth tool",
    "Qalam AI",
    "AI social media content",
    "LinkedIn scheduler",
  ],
  authors: [{ name: "ByQalam", url: siteUrl }],
  creator: "ByQalam",
  publisher: "ByQalam",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "ByQalam",
    title: "ByQalam — AI Writing Assistant",
    description:
      "AI-powered writing that sounds like you — for LinkedIn, threads, and professional content.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ByQalam — AI writing assistant",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ByQalam — AI Writing Assistant",
    description:
      "Write in your own voice with AI — LinkedIn and professional content for Pakistan and beyond.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@byqalam",
    site: "@byqalam",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${cormorant.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ByQalam",
              url: siteUrl,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "ByQalam is an AI writing assistant that learns your voice for LinkedIn and professional content.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Starter",
                  price: "1499",
                  priceCurrency: "PKR",
                  description: "Monthly Starter plan — Pakistan-friendly pricing.",
                },
                {
                  "@type": "Offer",
                  name: "Pro",
                  price: "3499",
                  priceCurrency: "PKR",
                  description: "Voice Fingerprint, calendar, analytics, scheduling.",
                },
                {
                  "@type": "Offer",
                  name: "Agency",
                  price: "8999",
                  priceCurrency: "PKR",
                  description: "Multi-client workspaces and collaboration.",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "150",
                bestRating: "5",
                worstRating: "1",
              },
              creator: {
                "@type": "Organization",
                name: "ByQalam",
                url: siteUrl,
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is Qalam?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Qalam is an AI-powered LinkedIn content platform that helps creators, founders, and marketing teams write and publish high-performing posts in a fraction of the time. It learns your unique writing voice to generate content that sounds exactly like you.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How does the Voice Fingerprint work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "You paste in 5\u201310 of your existing LinkedIn posts, and Qalam analyzes your sentence structure, vocabulary, tone, and cadence. It then mirrors your style in every piece of content it generates — so your audience always hears your authentic voice.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can I cancel my subscription anytime?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Absolutely. There are no long-term contracts. Cancel from your account settings at any time with one click. You'll retain access until the end of your billing period.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How many posts can I generate per month?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Free plan users can generate 5 posts per week (20/month). Pro and Team plan subscribers enjoy unlimited post generation with no caps on creativity.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Does Qalam work for any LinkedIn niche?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Qalam has been tested across SaaS, finance, HR, consulting, coaching, engineering, and 40+ other niches. The AI adapts to your industry's language and trending topics automatically.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is there a free trial for Pro?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes — Pro and Team plans include a 7-day free trial. No credit card required to start. Experience the full power of Qalam before committing.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <GridGlowBackground
          glowColors={["#b8e6c8", "#e8d5a8", "#7abf9e"]}
          backgroundColor="#fafaf8"
          gridColor="rgba(13,74,69,0.07)"
          glowCount={12}
        >
          <NavWrapper>{children}</NavWrapper>
        </GridGlowBackground>
      </body>
    </html>
  )
}
