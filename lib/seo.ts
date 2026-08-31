import type { Metadata } from "next"
import { MARKETING_LAST_MODIFIED } from "@/lib/marketing-content"
import { SEO_LANDING_ROUTES } from "@/lib/seo-landing-pages"
import { AGENCY_PLAN_LIVE } from "@/lib/pricing"

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
// Auth and authenticated product routes resolve directly to the app domain.
export const resolvePublicHref = (href: string) =>
  /^\/(?:login|signup|dashboard|settings|career)(?:[/?]|$)/.test(href)
    ? process.env.NODE_ENV === "development" ? href : `${APP_URL}${href}`
    : href

export const buildOgImageUrl = (title: string, description: string, tag?: string) => {
  const params = new URLSearchParams({ title, description })
  if (tag) params.set("tag", tag)
  return `${SITE_URL}/og?${params.toString()}`
}

export const buildBreadcrumbSchema = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

export const buildArticleSchema = ({
  title,
  description,
  url,
  datePublished,
  dateModified,
  image,
  wordCount,
}: {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified: string
  image: string
  wordCount?: number
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  datePublished,
  dateModified,
  image,
  ...(wordCount ? { wordCount } : {}),
  author: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": url },
  url,
})

export const buildOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  sameAs: [
    "https://www.linkedin.com/company/withqalam",
    "https://www.instagram.com/withqalam",
  ],
})

export const buildWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/blog?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
})

export const buildFaqSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
})

export const buildHowToSchema = ({
  name,
  description,
  steps,
}: {
  name: string
  description: string
  steps: { name: string; text: string }[]
}) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  description,
  step: steps.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.name,
    text: step.text,
  })),
})

export const buildPageMetadata = ({
  title,
  description,
  path,
  index = true,
  tag,
  keywords,
}: {
  title: string
  description: string
  path: string
  index?: boolean
  tag?: string
  keywords?: string[]
}): Metadata => {
  const ogImage = buildOgImageUrl(title, description, tag)
  return {
    title,
    description,
    keywords,
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
  { path: "/features", priority: 0.95, changeFrequency: "weekly", lastModified: "2026-08-18" },
  { path: "/industries", priority: 0.9, changeFrequency: "weekly", lastModified: "2026-08-18" },
  ...SEO_LANDING_ROUTES.map((path) => ({
    path,
    priority: 0.91,
    changeFrequency: "weekly" as const,
    lastModified: "2026-08-17",
  })),
  { path: "/ai-linkedin-writer", priority: 0.96, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/linkedin-extension", priority: 0.9, changeFrequency: "weekly", lastModified: "2026-08-18" },
  { path: "/pricing", priority: 0.95, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/career-visibility", priority: 0.94, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/linkedin-optimization", priority: 0.93, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/ats-resume-builder", priority: 0.92, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/job-description-match", priority: 0.9, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/methodology/linkedin-authority-score", priority: 0.82, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/methodology/ats-resume-readiness", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-17" },
  { path: "/free-tools", priority: 0.9, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/ats-resume-checker", priority: 0.97, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/hook-generator", priority: 0.88, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/comment-generator", priority: 0.85, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/headline-analyzer", priority: 0.82, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/profile-optimizer", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/carousel-builder", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/viral-checker", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/free-tools/engagement-predictor", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/about", priority: 0.7, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  ...(AGENCY_PLAN_LIVE
    ? [{ path: "/agency-setup", priority: 0.76, changeFrequency: "monthly" as const, lastModified: MARKETING_LAST_MODIFIED }]
    : []),
  { path: "/managed/apply", priority: 0.7, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/demo", priority: 0.85, changeFrequency: "weekly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/docs", priority: 0.55, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/changelog", priority: 0.6, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/status", priority: 0.55, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/legal/privacy", priority: 0.45, changeFrequency: "yearly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/legal/terms", priority: 0.45, changeFrequency: "yearly", lastModified: MARKETING_LAST_MODIFIED },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly", lastModified: MARKETING_LAST_MODIFIED },
]

export const LLM_ROUTES = [
  "/",
  "/features",
  "/industries",
  "/ai-linkedin-writer",
  "/linkedin-extension",
  ...SEO_LANDING_ROUTES,
  "/pricing",
  "/career-visibility",
  "/ats-resume-builder",
  "/methodology/ats-resume-readiness",
  "/demo",
  "/free-tools",
  "/free-tools/ats-resume-checker",
  "/free-tools/hook-generator",
  "/free-tools/comment-generator",
  "/free-tools/headline-analyzer",
  "/free-tools/profile-optimizer",
  "/free-tools/carousel-builder",
  "/free-tools/viral-checker",
  "/free-tools/engagement-predictor",
  "/about",
  "/contact",
  ...(AGENCY_PLAN_LIVE ? ["/agency-setup"] : []),
  "/blog",
  "/changelog",
  "/product/post-writer",
  "/product/voice-profile",
  "/product/hook-generator",
  "/product/comment-generator",
  "/product/post-scheduler",
  ...(AGENCY_PLAN_LIVE ? ["/product/agency-workspaces"] : []),
  "/use-cases/founders",
  "/use-cases/job-seekers",
  "/use-cases/recruiters",
  "/use-cases/career-coaches",
  "/use-cases/universities",
  "/use-cases/marketing-teams",
  "/use-cases/hr-leaders",
  "/use-cases/consultants",
  "/use-cases/agencies",
]
