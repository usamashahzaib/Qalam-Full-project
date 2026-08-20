import { describe, expect, it } from "vitest"
import { billingCycleDays } from "@/lib/server/payments"

describe("quarterly payment expiry", () => {
  it("uses a 90-day fallback when the provider omits period end for a quarterly cycle", () => {
    expect(billingCycleDays("quarterly")).toBe(90)
  })

  it("uses a 30-day fallback for monthly and any other/unset cycle", () => {
    expect(billingCycleDays("monthly")).toBe(30)
    expect(billingCycleDays("")).toBe(30)
  })

  it("uses a 365-day fallback for annual", () => {
    expect(billingCycleDays("annual")).toBe(365)
  })
})
