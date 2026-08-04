import { describe, it, expect } from "vitest"
import { formatPkr, plans, PLANS, PLAN_PRICES, COMPARISON_ROWS, AGENCY_PLAN_LIVE } from "@/lib/pricing"

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
  it("matches the canonical post and carousel quotas", () => {
    expect(plans.map(({ name, postsPerMonth, carouselsPerMonth }) => ({
      name,
      postsPerMonth,
      carouselsPerMonth,
    }))).toEqual([
      { name: "Free", postsPerMonth: 5, carouselsPerMonth: 1 },
      { name: "Solo", postsPerMonth: 30, carouselsPerMonth: 3 },
      { name: "Pro", postsPerMonth: 60, carouselsPerMonth: 10 },
      { name: "Agency", postsPerMonth: 300, carouselsPerMonth: 50 },
    ])
  })

  it("has exactly 3 public plans while Agency self-serve is unwired", () => {
    expect(AGENCY_PLAN_LIVE).toBe(false)
    expect(PLANS).toHaveLength(3)
  })

  it("does not publish the Agency plan on public surfaces yet", () => {
    expect(PLANS.find((p) => p.plan === "Agency")).toBeUndefined()
  })

  it("keeps Agency's manual onboarding pricing defined even while hidden", () => {
    const agency = plans.find((p) => p.name === "Agency")!
    expect(agency.hidden).toBe(true)
    expect(agency.monthlyPrice).toBe(3999)
    expect(agency.quarterlyPrice).toBe(7998)
  })

  it("Free plan has zero monthly price and no annual option", () => {
    const free = PLANS.find((p) => p.plan === "Free")!
    expect(free.monthlyPkr).toBe(0)
    expect(free.annualPkrPerMonth).toBeUndefined()
  })

  it("Solo starts at 799 PKR/month", () => {
    const solo = PLANS.find((p) => p.plan === "Solo")!
    expect(solo.monthlyPkr).toBe(799)
    expect(solo.features).toContain("3 carousels/month")
  })

  it("Pro starts at 1499 PKR/month", () => {
    const pro = PLANS.find((p) => p.plan === "Pro")!
    expect(pro.monthlyPkr).toBe(1499)
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

  it("quarterly billing charges 2 months for 3 months of access", () => {
    Object.values(PLAN_PRICES).forEach((prices) => {
      if (prices.monthly > 0) expect(prices.quarterly).toBe(prices.monthly * 2)
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

  it("quarterly price row matches current PLANS pricing", () => {
    const priceRow = COMPARISON_ROWS.find((r) => r.label === "Quarterly price")!
    expect(priceRow.free).toBe("Free")
    expect(priceRow.solo).toContain("1,598")
    expect(priceRow.pro).toContain("2,998")
    expect(priceRow.agency).toContain("7,998")
  })

  it("publishes every enforced plan capability", () => {
    const labels = COMPARISON_ROWS.map((row) => row.label)
    expect(labels).toEqual(expect.arrayContaining([
      "Slides per carousel",
      "Hook generations",
      "Content score analyses",
      "Client workspaces",
      "Team seats",
      "LinkedIn publishing",
      "Scheduling",
      "Approval workflow",
      "PDF export",
      "Analytics",
      "Competitor research",
      "AI Strategist",
      "Silent Growth tools",
    ]))
  })

  it("does not mislabel personal workspaces as client workspaces", () => {
    const row = COMPARISON_ROWS.find((item) => item.label === "Client workspaces")!
    expect(row.free).toBe("Not included")
    expect(row.solo).toBe("Not included")
    expect(row.pro).toBe("Not included")
    expect(row.agency).toBe("5")
  })
})
