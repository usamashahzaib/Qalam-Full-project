import { describe, expect, it } from "vitest"
import { addBillingCycleIso, formatPlanDate, getMonthlyQuotaWindow, isPlanExpired, normalizeSelectedPlanExpiry } from "@/lib/plan-expiry"

// Regression: ISSUE-001 - paid access used fixed day counts and expired plans could stay visible in admin.
// Found by /qa on 2026-09-02
// Report: .gstack/qa-reports/qa-report-localhost-2026-09-02.md
describe("billing periods", () => {
  it("uses calendar months for monthly, quarterly, and annual paid access", () => {
    const purchasedAt = new Date("2026-01-31T08:30:00.000Z")

    expect(addBillingCycleIso("monthly", purchasedAt)).toBe("2026-02-28T23:59:59.999Z")
    expect(addBillingCycleIso("quarterly", purchasedAt)).toBe("2026-04-30T23:59:59.999Z")
    expect(addBillingCycleIso("annual", purchasedAt)).toBe("2027-01-31T23:59:59.999Z")
  })

  it("keeps an admin-selected expiry date exact in storage and display", () => {
    const expiresAt = normalizeSelectedPlanExpiry("2026-08-25")

    expect(expiresAt).toBe("2026-08-25T23:59:59.999Z")
    expect(formatPlanDate(expiresAt)).toBe("Aug 25, 2026")
    expect(isPlanExpired(expiresAt, new Date("2026-08-25T23:59:59.998Z"))).toBe(false)
    expect(isPlanExpired(expiresAt, new Date("2026-08-26T00:00:00.000Z"))).toBe(true)
  })

  it("resets quarterly and annual allowances on each calendar month", () => {
    const quarterly = getMonthlyQuotaWindow("2026-01-31T08:30:00.000Z", "quarterly", new Date("2026-03-15T12:00:00.000Z"))
    const annual = getMonthlyQuotaWindow("2026-01-31T08:30:00.000Z", "annual", new Date("2026-03-15T12:00:00.000Z"))

    expect(quarterly).toMatchObject({
      windowStart: new Date("2026-02-28T08:30:00.000Z"),
      windowEnd: new Date("2026-03-31T08:30:00.000Z"),
    })
    expect(annual).toMatchObject({
      windowStart: new Date("2026-02-28T08:30:00.000Z"),
      windowEnd: new Date("2026-03-31T08:30:00.000Z"),
    })
  })
})
