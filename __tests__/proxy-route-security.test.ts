import { describe, expect, it } from "vitest"
import { APP_ONLY_EXTRA_PATHS, PROTECTED_API_ROUTES, PROTECTED_ROUTES, RATE_LIMITED_API_PREFIXES, buildCsp, isAppHostPath } from "@/proxy"

describe("proxy route security tables", () => {
  it("keeps competitor APIs explicitly protected", () => {
    expect(PROTECTED_API_ROUTES).toContain("/api/competitors")
  })

  it("rate limits every generate and auth API route by prefix", () => {
    expect(RATE_LIMITED_API_PREFIXES).toEqual(
      expect.arrayContaining(["/api/generate", "/api/auth"])
    )
  })

  it("keeps payment result and plan routes on the app host", () => {
    expect(APP_ONLY_EXTRA_PATHS).toEqual(
      expect.arrayContaining(["/upgrade", "/billing", "/plan"])
    )
  })

  it("keeps every auth route on the Auth.js app host", () => {
    expect(isAppHostPath("/login")).toBe(true)
    expect(isAppHostPath("/signup")).toBe(true)
    expect(isAppHostPath("/forgot-password")).toBe(true)
    expect(isAppHostPath("/pricing")).toBe(false)
  })

  it("keeps the complete Career Hub on the protected app host", () => {
    expect(PROTECTED_ROUTES).toContain("/career")
  })

  it("keeps scripts nonce-bound on auth-gated routes while allowing runtime framework styles", async () => {
    const csp = await buildCsp({ nonce: "test-nonce", isDev: false })
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' https://www.googletagmanager.com https://app.lemonsqueezy.com https://assets.lemonsqueezy.com")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src-elem 'self' 'unsafe-inline'")
    expect(csp).not.toContain("style-src 'self' 'nonce-test-nonce'")
    expect(csp.split("; ").find((d) => d.startsWith("script-src"))).not.toContain("unsafe-inline")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("upgrade-insecure-requests")
  })

  it("falls back to a static-friendly policy with no nonce on marketing routes", async () => {
    const csp = await buildCsp({ isDev: false })
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com")
    expect(csp).not.toContain("nonce-")
  })

  it("keeps local development on HTTP", async () => {
    expect(await buildCsp({ nonce: "test-nonce", isDev: true })).not.toContain("upgrade-insecure-requests")
  })
})
