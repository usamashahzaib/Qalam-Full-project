import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const gatedLayouts = {
  analytics: "Solo",
  calendar: "Solo",
  library: "Solo",
  approvals: "Pro",
  chat: "Pro",
  competitors: "Pro",
} as const

describe("paid page gating", () => {
  for (const [route, plan] of Object.entries(gatedLayouts)) {
    it(`gates ${route} at ${plan}`, () => {
      const source = readFileSync(resolve(process.cwd(), `app/(app)/${route}/layout.tsx`), "utf8")
      expect(source).toContain(`requiredPlan="${plan}"`)
    })
  }
})

describe("career network split access", () => {
  it("keeps candidate visibility on Free and recruiter search on Pro", () => {
    const layout = readFileSync(resolve(process.cwd(), "app/(app)/career/network/layout.tsx"), "utf8")
    const recruiterApi = readFileSync(resolve(process.cwd(), "app/api/career/recruiter-search/route.ts"), "utf8")
    expect(layout).toContain('requiredPlan="Free"')
    expect(recruiterApi).toContain('requirePlan(req, "Pro")')
    expect(recruiterApi).toContain("verified_recruiter_required")
  })
})
