import { describe, it, expect } from "vitest"
import { formatPkr, PLANS, PLAN_PRICES, COMPARISON_ROWS } from "@/lib/pricing"

describe("formatPkr", () => {
  it("returns 'Free' for zero", () => {
    expect(formatPkr(0)).toBe("Free")
  })

  it("returns 'Contact Us' for null", () => {
    expect(formatPkr(null)).toBe("Contact Us")
  })

  it("formats non-zero amounts with PKR prefix", () => {
    expect(formatPkr(499)).toContain("PKR")
    expect(formatPkr(499)).toContain("499")
  })

  it("formats numbers over 1000 with comma separator", () => {
    const result = formatPkr(1990)
    expect(result).toContain("1,990")
  })
})

describe("PLANS", () => {
  it("has exactly 3 public plans (Agency is hidden)", () => {
    expect(PLANS).toHaveLength(3)
  })

  it("does not include the Agency plan", () => {
    expect(PLANS.find((p) => p.plan === "Agency")).toBeUndefined()
  })

  it("Free plan has zero monthly price and no annual option", () => {
    const free = PLANS.find((p) => p.plan === "Free")!
    expect(free.monthlyPkr).toBe(0)
    expect(free.annualPkrPerMonth).toBeUndefined()
  })

  it("Solo starts at 499 PKR/month", () => {
    const solo = PLANS.find((p) => p.plan === "Solo")!
    expect(solo.monthlyPkr).toBe(499)
  })

  it("Pro starts at 1490 PKR/month", () => {
    const pro = PLANS.find((p) => p.plan === "Pro")!
    expect(pro.monthlyPkr).toBe(1490)
  })

  it("active paid plans have a positive monthly price", () => {
    PLANS.filter((p) => p.plan !== "Free" && !p.comingSoon).forEach((plan) => {
      expect(plan.monthlyPkr).toBeGreaterThan(0)
    })
  })

  it("annual price per month is lower than monthly for plans that offer it", () => {
    PLANS.filter((p) => p.annualPkrPerMonth != null).forEach((plan) => {
      expect(plan.annualPkrPerMonth!).toBeLessThan(plan.monthlyPkr!)
    })
  })

  it("active plans are in ascending price order", () => {
    const activePlans = PLANS.filter((p) => !p.comingSoon)
    const prices = activePlans.map((p) => p.monthlyPkr ?? 0)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
    }
  })

  it("every plan has at least one feature listed", () => {
    PLANS.forEach((plan) => {
      expect(plan.features.length).toBeGreaterThan(0)
    })
  })

  it("exactly one plan is highlighted", () => {
    const highlighted = PLANS.filter((p) => p.highlighted)
    expect(highlighted).toHaveLength(1)
  })

  it("highlighted plan is Solo", () => {
    const highlighted = PLANS.find((p) => p.highlighted)!
    expect(highlighted.plan).toBe("Solo")
  })
})

describe("PLAN_PRICES consistency with PLANS", () => {
  it("monthly prices match PLANS entries for active plans", () => {
    PLANS.filter((p) => !p.comingSoon).forEach((plan) => {
      if (PLAN_PRICES[plan.plan]) {
        expect(PLAN_PRICES[plan.plan].monthly).toBe(plan.monthlyPkr)
      }
    })
  })

  it("annual total is less than 12 monthly payments for all paid plans", () => {
    Object.entries(PLAN_PRICES).forEach(([, prices]) => {
      if (prices.monthly > 0 && prices.annual > 0) {
        expect(prices.annual).toBeLessThan(prices.monthly * 12)
      }
    })
  })

  it("Free has zero for both monthly and annual", () => {
    expect(PLAN_PRICES.Free.monthly).toBe(0)
    expect(PLAN_PRICES.Free.annual).toBe(0)
  })
})

describe("COMPARISON_ROWS integrity", () => {
  it("has at least one row", () => {
    expect(COMPARISON_ROWS.length).toBeGreaterThan(0)
  })

  it("every row has the three active plan columns", () => {
    COMPARISON_ROWS.forEach((row) => {
      expect(row).toHaveProperty("label")
      expect(row).toHaveProperty("free")
      expect(row).toHaveProperty("solo")
      expect(row).toHaveProperty("pro")
    })
  })

  it("monthly price row matches current PLANS pricing", () => {
    const priceRow = COMPARISON_ROWS.find((r) => r.label === "Monthly price")!
    expect(priceRow.free).toBe("Free")
    expect(priceRow.solo).toContain("499")
    expect(priceRow.pro).toContain("1,490")
  })
})
