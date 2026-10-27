import type { Metadata } from "next"
import { SEO_LANDING_PAGES, SEO_LANDING_ROUTES } from "@/lib/seo-landing-pages"
import { AGENCY_PLAN_LIVE } from "@/lib/pricing"
import { PROTECTED_ROUTES } from "@/lib/protected-routes"

export type PublicRoute = {
  path: string
  priority: number
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly"
  lastModified: string
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.byqalam.com").replace(/\/$/, "")
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.byqalam.com").replace(/\/$/, "")
export const SITE_NAME = "Qalam"
export const absoluteUrl = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`
// Auth and authenticated product routes resolve directly to the app domain.
export const resolvePublicHref = (href: string) =>
  ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/upgrade", "/billing", "/extension/connect", ...PROTECTED_ROUTES]
    .some((path) => href === path || href.startsWith(`${path}/`) || href.startsWith(`${path}?`) || href.startsWith(`${path}#`))
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
})

/** Drops the top-level @context so a schema object can sit inside an @graph. */
export const stripContext = <T extends { "@context"?: string }>(schema: T): Omit<T, "@context"> => {
  const copy: Partial<T> = { ...schema }
  delete copy["@context"]
  return copy as Omit<T, "@context">
}

/**
 * A plan offer that says what the price covers. Paid plans bill per quarter, so
 * a bare `price` would read as a monthly or one-off figure to a crawler or an
 * answer engine. A free plan carries no billing period.
 */
export const buildPlanOffer = ({
  name,
  priceUsd,
  description,
  url,
  availability = "https://schema.org/InStock",
  billingMonths,
}: {
  name: string
  priceUsd: number
  description: string
  url?: string
  availability?: string
  billingMonths?: number
}) => ({
  "@type": "Offer",
  name,
  price: String(priceUsd),
  priceCurrency: "USD",
  description,
  availability,
  ...(url ? { url } : {}),
  ...(priceUsd > 0 && billingMonths
    ? {
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(priceUsd),
          priceCurrency: "USD",
          billingDuration: billingMonths,
          unitCode: "MON",
        },
      }
    : {}),
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

// Last-change dates per route, taken from `git log -1 --format=%cs -- <route source files>`
// on 2026-10-27. These feed sitemap <lastmod>, so they must move only when the page
// actually changes. Bump the one entry you touched in the same commit as the change.
// SEO landing pages, product pages, use-case pages and blog posts carry their own
// dates in their content objects and are not listed here.
const ROUTE_LASTMOD: Record<string, string> = {
  "/": "2026-09-26",
  "/features": "2026-09-26",
  "/industries": "2026-09-26",
  "/ai-linkedin-writer": "2026-09-26",
  "/linkedin-extension": "2026-09-26",
  "/pricing": "2026-09-26",
  "/career-visibility": "2026-09-26",
  "/linkedin-optimization": "2026-09-25",
  "/ats-resume-builder": "2026-09-26",
  "/job-description-match": "2026-07-29",
  "/methodology/linkedin-authority-score": "2026-07-29",
  "/methodology/ats-resume-readiness": "2026-09-26",
  "/free-tools": "2026-09-26",
  "/free-tools/ats-resume-checker": "2026-08-31",
  "/free-tools/hook-generator": "2026-09-11",
  "/free-tools/comment-generator": "2026-09-11",
  "/free-tools/headline-analyzer": "2026-09-11",
  "/free-tools/profile-optimizer": "2026-09-11",
  "/free-tools/carousel-builder": "2026-08-17",
  "/free-tools/viral-checker": "2026-08-24",
  "/free-tools/engagement-predictor": "2026-08-24",
  "/about": "2026-09-01",
  "/partners": "2026-09-26",
  "/blog": "2026-09-26",
  "/contact": "2026-09-26",
  "/managed/apply": "2026-09-26",
  "/demo": "2026-09-26",
  "/docs": "2026-09-07",
  "/changelog": "2026-09-15",
  "/status": "2026-08-27",
  "/legal/privacy": "2026-09-26",
  "/legal/terms": "2026-08-31",
  "/careers": "2026-09-01",
}

const route = (
  path: string,
  priority: number,
  changeFrequency: PublicRoute["changeFrequency"],
): PublicRoute => ({ path, priority, changeFrequency, lastModified: ROUTE_LASTMOD[path] })

export const PUBLIC_ROUTES: PublicRoute[] = [
  route("/", 1, "weekly"),
  route("/features", 0.95, "weekly"),
  route("/industries", 0.9, "weekly"),
  ...SEO_LANDING_ROUTES.map((path) => ({
    path,
    priority: 0.91,
    changeFrequency: "weekly" as const,
    lastModified: SEO_LANDING_PAGES[path.slice(1)].updatedAt,
  })),
  route("/ai-linkedin-writer", 0.96, "weekly"),
  route("/linkedin-extension", 0.9, "weekly"),
  route("/pricing", 0.95, "weekly"),
  route("/career-visibility", 0.94, "weekly"),
  route("/linkedin-optimization", 0.93, "weekly"),
  route("/ats-resume-builder", 0.92, "weekly"),
  route("/job-description-match", 0.9, "weekly"),
  route("/methodology/linkedin-authority-score", 0.82, "monthly"),
  route("/methodology/ats-resume-readiness", 0.9, "monthly"),
  route("/free-tools", 0.9, "weekly"),
  route("/free-tools/ats-resume-checker", 0.97, "weekly"),
  route("/free-tools/hook-generator", 0.88, "weekly"),
  route("/free-tools/comment-generator", 0.85, "weekly"),
  route("/free-tools/headline-analyzer", 0.82, "weekly"),
  route("/free-tools/profile-optimizer", 0.8, "weekly"),
  route("/free-tools/carousel-builder", 0.8, "weekly"),
  route("/free-tools/viral-checker", 0.8, "weekly"),
  route("/free-tools/engagement-predictor", 0.8, "weekly"),
  route("/about", 0.7, "monthly"),
  route("/partners", 0.84, "monthly"),
  route("/blog", 0.8, "weekly"),
  route("/contact", 0.7, "monthly"),
  route("/managed/apply", 0.7, "monthly"),
  route("/demo", 0.85, "weekly"),
  route("/docs", 0.55, "monthly"),
  route("/changelog", 0.6, "monthly"),
  route("/status", 0.55, "monthly"),
  route("/legal/privacy", 0.45, "yearly"),
  route("/legal/terms", 0.45, "yearly"),
  route("/careers", 0.5, "monthly"),
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
  "/partners",
  "/contact",
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
