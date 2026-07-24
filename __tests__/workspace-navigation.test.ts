import { describe, expect, it } from "vitest"
import { getActiveNavigationHref } from "@/lib/workspace-navigation"

const hrefs = ["/dashboard", "/settings/referrals", "/settings"]

describe("workspace navigation", () => {
  it("selects only the most specific matching sidebar route", () => {
    expect(getActiveNavigationHref("/settings/referrals", hrefs)).toBe("/settings/referrals")
    expect(getActiveNavigationHref("/settings", hrefs)).toBe("/settings")
  })

  it("keeps dashboard matching exact while supporting nested feature routes", () => {
    expect(getActiveNavigationHref("/dashboard/report", hrefs)).toBeNull()
    expect(getActiveNavigationHref("/settings/referrals/history", hrefs)).toBe("/settings/referrals")
  })
})
