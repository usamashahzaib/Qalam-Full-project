import { describe, expect, it } from "vitest"
import { APP_URL, LLM_ROUTES, PUBLIC_ROUTES, resolvePublicHref } from "@/lib/seo"
import { SEO_LANDING_PAGES } from "@/lib/seo-landing-pages"

const discoverySlugs = [
  "ats-resume-score",
  "resume-keyword-match",
  "ats-safe-resume-templates",
  "recruiter-resume-review",
  "linkedin-headline-examples",
  "linkedin-about-examples",
  "linkedin-profile-optimization",
  "ai-linkedin-post-generator",
] as const

describe("SEO discovery sprint", () => {
  it("gives each intent page original content and a real product path", () => {
    for (const slug of discoverySlugs) {
      const page = SEO_LANDING_PAGES[slug]
      expect(page).toBeDefined()
      expect(page.title).not.toBe(page.h1)
      expect(page.description.length).toBeGreaterThan(110)
      expect(page.sections.length).toBeGreaterThanOrEqual(3)
      expect(page.example?.body.length).toBeGreaterThan(100)
      expect(page.faqs.length).toBeGreaterThanOrEqual(2)
      expect(page.tool?.href).toMatch(/^\//)
      expect(page.methodology?.href).toMatch(/^\//)
    }
  })

  it("publishes every discovery page to search, LLM, and IndexNow route registries", () => {
    const publicPaths = PUBLIC_ROUTES.map(({ path }) => path)
    const llmPaths = LLM_ROUTES

    for (const slug of discoverySlugs) {
      expect(publicPaths).toContain(`/${slug}`)
      expect(llmPaths).toContain(`/${slug}`)
    }
  })

  it("sends auth CTAs directly to the app host without crawl-time redirects", () => {
    expect(resolvePublicHref("/login?callbackUrl=/career")).toBe(`${APP_URL}/login?callbackUrl=/career`)
    expect(resolvePublicHref("/signup")).toBe(`${APP_URL}/signup`)
    expect(resolvePublicHref("/free-tools/ats-resume-checker")).toBe("/free-tools/ats-resume-checker")
  })
})
