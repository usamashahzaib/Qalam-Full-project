import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import sitemap from "@/app/sitemap"
import robots from "@/app/robots"
import { SEO_LANDING_ROUTES } from "@/lib/seo-landing-pages"
import { PROTECTED_ROUTES } from "@/lib/protected-routes"
import { GET as llmsFull } from "@/app/llms-full.txt/route"
import { REDIRECTED_SEO_SLUGS } from "@/lib/seo-redirects"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

describe("audit remediations", () => {
  it("includes every canonical SEO landing page in the sitemap", () => {
    const urls = new Set(sitemap().map((entry) => entry.url))
    SEO_LANDING_ROUTES.forEach((route) => expect([...urls].some((url) => url.endsWith(route))).toBe(true))
  })

  it("derives crawler exclusions from the protected route list", () => {
    const disallow = robots().rules?.find((rule) => rule.userAgent === "*")?.disallow
    expect(disallow).toEqual(expect.arrayContaining([...PROTECTED_ROUTES]))
  })

  it("does not advertise redirected landing pages to LLM crawlers", async () => {
    const body = await llmsFull().text()
    REDIRECTED_SEO_SLUGS.forEach((slug) => expect(body).not.toContain(`- URL: https://byqalam.com/${slug}`))
  })

  it("uses a fresh workspace lookup for extension voice context", () => {
    const auth = source("lib/server/extension-auth.ts")
    const route = source("app/api/extension/comments/route.ts")
    const connect = source("app/api/extension/connect/route.ts")
    expect(auth).toContain("resolveExtensionWorkspace")
    expect(auth).not.toContain("workspaceId: string | null")
    expect(connect).not.toContain("workspaceId: user.workspaceId")
    expect(route).toContain("resolveExtensionWorkspace(identity.userId)")
    expect(route).toContain("workspace_access_revoked")
  })

  it("reserves extension comment quota before calling the model", () => {
    const route = source("app/api/extension/comments/route.ts")
    expect(route.indexOf("reserveCommentUsage")).toBeLessThan(route.indexOf("callAi(\"chat-strategist\""))
    expect(route).toContain("releaseCommentUsage(identity.userId)")
  })

  it("keeps legal redirects at the configuration layer", () => {
    const config = source("next.config.ts")
    expect(config).toContain('source: "/terms"')
    expect(config).toContain('destination: "/legal/terms"')
  })
})
