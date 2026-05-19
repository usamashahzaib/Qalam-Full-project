import type { Metadata } from "next"
import { MARKETING_LAST_MODIFIED } from "@/lib/marketing-content"

export type PublicRoute = {
  path: string
  priority: number
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly"
  lastModified: string
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com").replace(/\/$/, "")
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.byqalam.com").replace(/\/$/, "")
export const SITE_NAME = "Qalam"
export const SITE_DOMAIN_LABEL = "byqalam.com"

export const absoluteUrl = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`

export const buildOgImageUrl = (title: string, description: string, tag?: string) => {
  const params = new URLSearchParams({ title, description })
  if (tag) params.set("tag", tag)
  return `${SITE_URL}/og?${params.toString()}`
}

export const buildPageMetadata = ({
  title,
  description,
  path,
  index = true,
  tag,
}: {
  title: string
  description: string
  path: string
  index?: boolean
  tag?: string
}): Metadata => {
  const ogImage = buildOgImageUrl(title, description, tag)
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(path),
      type: "website",
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    robots: index
      ? undefined
      : {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
  }
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/", priority: 1, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/pricing", priority: 0.95, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools", priority: 0.9, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/hook-generator", priority: 0.88, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/headline-analyzer", priority: 0.82, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/profile-optimizer", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/carousel-builder", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/viral-checker", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/engagement-predictor", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/about", priority: 0.7, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/agency-setup", priority: 0.76, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/demo", priority: 0.85, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/docs", priority: 0.55, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/changelog", priority: 0.6, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/status", priority: 0.55, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/privacy", priority: 0.45, changeFrequency: "yearly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/terms", priority: 0.45, changeFrequency: "yearly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
]

export const LLM_ROUTES = [
  "/",
  "/pricing",
  "/demo",
  "/free-tools",
  "/about",
  "/contact",
  "/agency-setup",
  "/blog",
  "/changelog",
  "/product/post-writer",
  "/product/voice-profile",
  "/product/hook-generator",
  "/product/post-scheduler",
  "/product/agency-workspaces",
  "/use-cases/founders",
  "/use-cases/marketing-teams",
  "/use-cases/hr-leaders",
  "/use-cases/consultants",
  "/use-cases/agencies",
]
