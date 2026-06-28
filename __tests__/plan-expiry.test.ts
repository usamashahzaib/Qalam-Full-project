import { describe, expect, it } from "vitest"
import { addMonthsIso, resolvePlanExpiry } from "@/lib/plan-expiry"

describe("plan expiry", () => {
  it("uses buy date plus one calendar month", () => {
    expect(addMonthsIso("2026-06-17T10:00:00.000Z")).toBe("2026-07-17T10:00:00.000Z")
  })

  it("clamps month-end dates", () => {
    expect(addMonthsIso("2026-01-31T10:00:00.000Z")).toBe("2026-02-28T10:00:00.000Z")
  })

  it("returns stored expiry when available (stored takes priority over buy-date)", () => {
    expect(resolvePlanExpiry("2027-01-01T00:00:00.000Z", "2026-06-17T10:00:00.000Z")).toBe("2027-01-01T00:00:00.000Z")
  })
})
