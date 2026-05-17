import type { Metadata } from "next"

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://byqalam.com").replace(/\/$/, "")
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.byqalam.com").replace(/\/$/, "")
export const SITE_NAME = "Qalam"
export const SITE_DOMAIN_LABEL = "byqalam.com"

export const absoluteUrl = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`

export const buildPageMetadata = ({
  title,
  description,
  path,
  index = true,
}: {
  title: string
  description: string
  path: string
  index?: boolean
}): Metadata => ({
  title,
  description,
  alternates: { canonical: absoluteUrl(path) },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: absoluteUrl(path),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
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
})

export const PUBLIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.95, changeFrequency: "weekly" as const },
  { path: "/free-tools", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/free-tools/hook-generator", priority: 0.88, changeFrequency: "weekly" as const },
  { path: "/free-tools/headline-analyzer", priority: 0.82, changeFrequency: "weekly" as const },
  { path: "/free-tools/profile-optimizer", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/free-tools/carousel-builder", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/free-tools/viral-checker", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/free-tools/engagement-predictor", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/agency-setup", priority: 0.76, changeFrequency: "monthly" as const },
  { path: "/docs", priority: 0.55, changeFrequency: "monthly" as const },
  { path: "/changelog", priority: 0.55, changeFrequency: "monthly" as const },
  { path: "/status", priority: 0.55, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.45, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.45, changeFrequency: "yearly" as const },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/product/post-writer", priority: 0.72, changeFrequency: "monthly" as const },
  { path: "/product/voice-profile", priority: 0.74, changeFrequency: "monthly" as const },
  { path: "/product/hook-generator", priority: 0.68, changeFrequency: "monthly" as const },
  { path: "/product/post-scheduler", priority: 0.68, changeFrequency: "monthly" as const },
  { path: "/product/agency-workspaces", priority: 0.72, changeFrequency: "monthly" as const },
  { path: "/use-cases/founders", priority: 0.66, changeFrequency: "monthly" as const },
  { path: "/use-cases/marketing-teams", priority: 0.66, changeFrequency: "monthly" as const },
  { path: "/use-cases/hr-leaders", priority: 0.62, changeFrequency: "monthly" as const },
  { path: "/use-cases/consultants", priority: 0.62, changeFrequency: "monthly" as const },
  { path: "/use-cases/agencies", priority: 0.68, changeFrequency: "monthly" as const },
]

export const LLM_ROUTES = [
  "/",
  "/pricing",
  "/free-tools",
  "/about",
  "/contact",
  "/agency-setup",
  "/product/post-writer",
  "/product/voice-profile",
  "/product/agency-workspaces",
  "/use-cases/founders",
  "/use-cases/marketing-teams",
  "/use-cases/agencies",
]
