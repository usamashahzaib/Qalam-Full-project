import { describe, expect, it } from "vitest"
import { NAV_GROUPS } from "@/components/AppShell"
import { MOBILE_MORE_LINKS, MOBILE_PRIMARY_LINKS } from "@/components/AppMobileNav"

describe("mobile navigation entitlements", () => {
  it("matches desktop plan gates for every shared route", () => {
    const desktop = new Map(
      NAV_GROUPS.flatMap((group) => group.links).map((link) => [link.href, link.requiredPlan])
    )

    for (const link of [...MOBILE_PRIMARY_LINKS, ...MOBILE_MORE_LINKS]) {
      expect(link.requiredPlan).toBe(desktop.get(link.href))
    }
  })
})
