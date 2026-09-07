import { describe, expect, it } from "vitest"
import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import { PROTECTED_ROUTES } from "@/lib/protected-routes"
import { buildWebSiteSchema } from "@/lib/seo"

const matches = (rule: string, path: string) => {
  const anchored = rule.endsWith("$")
  return anchored ? path === rule.slice(0, -1) : path.startsWith(rule)
}

describe("crawler discovery boundaries", () => {
  it("allows every sitemap path for each declared crawler", () => {
    const rules = robots().rules
    for (const group of Array.isArray(rules) ? rules : [rules]) {
      const blocked = typeof group.disallow === "string" ? [group.disallow] : group.disallow ?? []
      for (const entry of sitemap()) {
        const path = new URL(entry.url).pathname
        expect(blocked.some((rule) => matches(rule, path)), `${group.userAgent}: ${path}`).toBe(false)
      }
    }
  })

  it("still excludes private routes, query strings and nested paths", () => {
    const rules = robots().rules
    const group = Array.isArray(rules) ? rules[0] : rules
    const blocked = group.disallow as string[]
    for (const route of PROTECTED_ROUTES) {
      for (const path of [route, `${route}?tab=all`, `${route}/detail`]) {
        expect(blocked.some((rule) => matches(rule, path)), path).toBe(true)
      }
    }
  })

  it("publishes each canonical URL once", () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it("does not advertise a search feature the blog does not implement", () => {
    expect(buildWebSiteSchema()).not.toHaveProperty("potentialAction")
  })
})
