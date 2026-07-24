import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const route = readFileSync("app/api/voice/import-document/route.ts", "utf8")

describe("voice document import privacy", () => {
  it("does not use persistent file or object storage", () => {
    expect(route).not.toMatch(/storage\.from|createWriteStream|writeFile|writeFileSync/)
    expect(route).toContain("rawTextStored: false")
    expect(route).toContain("sourceDeleted: true")
  })

  it("requires authentication, Pro access, rate limiting, and non-cached AI", () => {
    expect(route).toContain("withAuth")
    expect(route).toContain('requirePlan(req, "Pro")')
    expect(route).toContain("checkRateLimit")
    expect(route).toContain("cache: false")
  })
})
