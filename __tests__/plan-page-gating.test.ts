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
  "career/network": "Pro",
} as const

describe("paid page gating", () => {
  for (const [route, plan] of Object.entries(gatedLayouts)) {
    it(`gates ${route} at ${plan}`, () => {
      const source = readFileSync(resolve(process.cwd(), `app/(app)/${route}/layout.tsx`), "utf8")
      expect(source).toContain(`requiredPlan="${plan}"`)
    })
  }
})
