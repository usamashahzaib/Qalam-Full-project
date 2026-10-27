import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PUBLIC_ROUTES, buildPlanOffer, stripContext } from "@/lib/seo"
import { PLANS, formatPrice } from "@/lib/pricing"

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8")

describe("SEO metadata integrity", () => {
  it("does not set a site-wide canonical in the root layout", () => {
    // A canonical here is inherited by every page that sets no alternates of its
    // own, which tells search engines those pages are copies of the homepage.
    const layout = read("app/layout.tsx")
    expect(layout).not.toMatch(/canonical\s*:/)
    expect(read("app/page.tsx")).toMatch(/alternates:\s*\{\s*canonical:\s*SITE_URL\s*\}/)
  })

  it("keeps sitemap lastmod dates real and varied", () => {
    const today = new Date().toISOString().slice(0, 10)
    const dates = PUBLIC_ROUTES.map((route) => route.lastModified)
    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(date <= today).toBe(true)
    }
    // One date on every page is a signal crawlers learn to ignore.
    expect(new Set(dates).size).toBeGreaterThan(3)
  })

  it("states the billing period on paid offers and none on free ones", () => {
    const paid = buildPlanOffer({ name: "Solo", priceUsd: 10, description: "x", billingMonths: 3 })
    expect(paid.priceSpecification).toMatchObject({
      "@type": "UnitPriceSpecification",
      price: "10",
      priceCurrency: "USD",
      billingDuration: 3,
      unitCode: "MON",
    })
    expect(buildPlanOffer({ name: "Free", priceUsd: 0, description: "x" })).not.toHaveProperty("priceSpecification")
    expect(buildPlanOffer({ name: "Add-on", priceUsd: 7, description: "x" })).not.toHaveProperty("priceSpecification")
  })

  it("strips @context so a schema object can sit inside an @graph", () => {
    expect(stripContext({ "@context": "https://schema.org", "@type": "Thing" })).toEqual({ "@type": "Thing" })
  })

  it("quotes quarterly prices from lib/pricing, never a monthly figure, in public copy", () => {
    const pro = formatPrice(PLANS.find((plan) => plan.plan === "Pro")?.quarterlyUsd)
    expect(pro).toBe("$18")
    expect(read("app/free-tools/page.tsx")).not.toMatch(/Pro starts at \$9\/month/)

    const pricingPage = read("app/pricing/page.tsx")
    expect(pricingPage).toContain("a Quarter")
    expect(pricingPage).not.toMatch(/Career Visibility Plans/)

    const llms = read("app/llms.txt/route.ts")
    expect(llms).toContain("PLANS.filter")
    expect(llms).not.toMatch(/"- (Solo|Pro): \$\d+ per quarter\."/)
  })
})
