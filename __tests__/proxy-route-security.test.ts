import { describe, expect, it } from "vitest"
import { APP_ONLY_EXTRA_PATHS, PROTECTED_API_ROUTES, RATE_LIMITED_API_PREFIXES, buildCsp } from "@/proxy"

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

  it("keeps scripts nonce-bound while allowing runtime framework styles", () => {
    const csp = buildCsp("test-nonce", false)
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src-elem 'self' 'unsafe-inline'")
    expect(csp).not.toContain("style-src 'self' 'nonce-test-nonce'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("upgrade-insecure-requests")
  })

  it("keeps local development on HTTP", () => {
    expect(buildCsp("test-nonce", true)).not.toContain("upgrade-insecure-requests")
  })
})
