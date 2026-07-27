import { describe, it, expect } from "vitest"
import {
  canAccessPlan,
  getPlanLimits,
  getPlanSummary,
  getUpgradeTarget,
  formatLimit,
  PLAN_ORDER,
  PLAN_HIERARCHY,
  PLAN_LIMITS,
} from "@/lib/entitlements"

describe("canAccessPlan", () => {
  it("allows same-tier access", () => {
    expect(canAccessPlan("Free", "Free")).toBe(true)
    expect(canAccessPlan("Solo", "Solo")).toBe(true)
    expect(canAccessPlan("Pro", "Pro")).toBe(true)
    expect(canAccessPlan("Agency", "Agency")).toBe(true)
  })

  it("allows higher tier to access lower tier features", () => {
    expect(canAccessPlan("Pro", "Free")).toBe(true)
    expect(canAccessPlan("Pro", "Solo")).toBe(true)
    expect(canAccessPlan("Agency", "Pro")).toBe(true)
    expect(canAccessPlan("Agency", "Solo")).toBe(true)
    expect(canAccessPlan("Agency", "Free")).toBe(true)
  })

  it("blocks lower tier from higher tier features", () => {
    expect(canAccessPlan("Free", "Solo")).toBe(false)
    expect(canAccessPlan("Free", "Pro")).toBe(false)
    expect(canAccessPlan("Free", "Agency")).toBe(false)
    expect(canAccessPlan("Solo", "Pro")).toBe(false)
    expect(canAccessPlan("Solo", "Agency")).toBe(false)
    expect(canAccessPlan("Pro", "Agency")).toBe(false)
  })

  it("returns false for unknown plan names", () => {
    expect(canAccessPlan("Unknown", "Free")).toBe(false)
    expect(canAccessPlan("", "Free")).toBe(false)
    expect(canAccessPlan("premium", "Solo")).toBe(false)
  })
})

describe("getUpgradeTarget", () => {
  it("uses progressive upgrade messaging", () => {
    expect(getUpgradeTarget("Free", "Solo")).toBe("Solo")
    expect(getUpgradeTarget("Free", "Pro")).toBe("Solo")
    expect(getUpgradeTarget("Solo", "Pro")).toBe("Pro")
  })

  it("keeps Agency non-purchasable and Pro fully unlocked", () => {
    expect(getUpgradeTarget("Pro", "Pro")).toBeNull()
    expect(getUpgradeTarget("Pro", "Agency")).toBeNull()
    expect(getUpgradeTarget("Free", "Agency")).toBeNull()
  })
})

describe("getPlanLimits", () => {
  it("Free: correct limits", () => {
    const limits = getPlanLimits("Free")
    expect(limits.aiDraftsPerMonth).toBe(5)
    expect(limits.carouselGenerationsPerMonth).toBe(1)
    expect(limits.linkedinPublish).toBe(false)
    expect(limits.scheduling).toBe(false)
    expect(limits.approvals).toBe(false)
    expect(limits.canExport).toBe(false)
    expect(limits.analyticsDepth).toBe("none")
    expect(limits.seats).toBe(1)
  })

  it("Solo: correct limits", () => {
    const limits = getPlanLimits("Solo")
    expect(limits.aiDraftsPerMonth).toBe(30)
    expect(limits.linkedinPublish).toBe(true)
    expect(limits.scheduling).toBe(true)
    expect(limits.approvals).toBe(false)
    expect(limits.canExport).toBe(false)
    expect(limits.analyticsDepth).toBe("basic")
    expect(limits.voiceTraining).toBe(false)
    expect(limits.carouselGenerationsPerMonth).toBe(3)
  })

  it("Pro: 60 drafts, approvals, export", () => {
    const limits = getPlanLimits("Pro")
    expect(limits.aiDraftsPerMonth).toBe(60)
    expect(limits.approvals).toBe(true)
    expect(limits.canExport).toBe(true)
    expect(limits.researchRunsPerMonth).toBe(5)
    expect(limits.clientWorkspaces).toBe(0)
  })

  it("Agency: 5 client workspaces, 5 seats, 300 drafts", () => {
    const limits = getPlanLimits("Agency")
    expect(limits.clientWorkspaces).toBe(5)
    expect(limits.seats).toBe(5)
    expect(limits.aiDraftsPerMonth).toBe(300)
    expect(limits.carouselGenerationsPerMonth).toBe(50)
    expect(limits.researchRunsPerMonth).toBe(25)
  })

  it("unknown plan falls back to Free limits", () => {
    expect(getPlanLimits("InvalidPlan")).toEqual(PLAN_LIMITS.Free)
    expect(getPlanLimits("")).toEqual(PLAN_LIMITS.Free)
  })
})

describe("formatLimit", () => {
  it("formats 'unlimited' as 'Unlimited'", () => {
    expect(formatLimit("unlimited")).toBe("Unlimited")
  })

  it("formats 0 as 'Not included'", () => {
    expect(formatLimit(0)).toBe("Not included")
  })

  it("formats positive numbers as their string value", () => {
    expect(formatLimit(5)).toBe("5")
    expect(formatLimit(30)).toBe("30")
    expect(formatLimit(3)).toBe("3")
  })
})

describe("getPlanSummary", () => {
  it("Free: shows draft cap and carousel count", () => {
    const summary = getPlanSummary("Free")
    expect(summary).toContain("5 posts/month")
    expect(summary).toContain("1 carousel/month")
    expect(summary).not.toContain("LinkedIn publish")
  })

  it("Solo: shows draft cap and carousel count", () => {
    const summary = getPlanSummary("Solo")
    expect(summary).toContain("30 posts/month")
    expect(summary).toContain("3 carousels/month")
    expect(summary).toContain("LinkedIn publish")
    expect(summary).toContain("Post scheduling")
  })

  it("Pro: 60 drafts, approvals, no client workspaces", () => {
    const summary = getPlanSummary("Pro")
    expect(summary).toContain("60 posts/month")
    expect(summary).toContain("Approval workflow")
    expect(summary).not.toContain("client workspaces")
  })

  it("Agency: shows 5 client workspaces", () => {
    const summary = getPlanSummary("Agency")
    expect(summary).toContain("5 client workspaces")
  })
})

describe("PLAN_ORDER and PLAN_HIERARCHY integrity", () => {
  it("has all four plans in ascending order", () => {
    expect(PLAN_ORDER).toEqual(["Free", "Solo", "Pro", "Agency"])
  })

  it("PLAN_HIERARCHY indices match PLAN_ORDER positions", () => {
    PLAN_ORDER.forEach((plan, idx) => {
      expect(PLAN_HIERARCHY[plan]).toBe(idx)
    })
  })

  it("each plan's hierarchy value is strictly greater than the previous", () => {
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      expect(PLAN_HIERARCHY[PLAN_ORDER[i]]).toBeGreaterThan(PLAN_HIERARCHY[PLAN_ORDER[i - 1]])
    }
  })
})
