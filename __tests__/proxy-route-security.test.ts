import { describe, expect, it } from "vitest"
import { PROTECTED_API_ROUTES, RATE_LIMITED_API_PREFIXES } from "@/proxy"

describe("proxy route security tables", () => {
  it("keeps competitor APIs explicitly protected", () => {
    expect(PROTECTED_API_ROUTES).toContain("/api/competitors")
  })

  it("rate limits every generate and auth API route by prefix", () => {
    expect(RATE_LIMITED_API_PREFIXES).toEqual(
      expect.arrayContaining(["/api/generate", "/api/auth"])
    )
  })
})
