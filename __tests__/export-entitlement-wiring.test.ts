import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { getPlanLimits } from "@/lib/entitlements"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("PDF export entitlement wiring", () => {
  it("keeps PDF export Pro-only in canonical limits", () => {
    expect(getPlanLimits("Free").canExport).toBe(false)
    expect(getPlanLimits("Solo").canExport).toBe(false)
    expect(getPlanLimits("Pro").canExport).toBe(true)
    expect(getPlanLimits("Agency").canExport).toBe(true)
  })

  it("checks the export flag after authentication instead of hard-blocking overrides", () => {
    const route = source("app/api/carousel/[id]/pdf/route.ts")
    expect(route).toContain('requirePlan(req, "Free")')
    expect(route).toContain("planCheck.limits.canExport")
  })

  it("locks both carousel PDF controls to Pro", () => {
    const editor = source("app/(app)/carousels/[id]/page.tsx")
    const writer = source("app/(app)/writer/page.tsx")
    expect(editor).toContain('<LockedFeature feature="Export to PDF" requiredPlan="Pro"')
    expect(writer).toContain('<LockedFeature feature="Export to PDF" requiredPlan="Pro"')
  })
})
