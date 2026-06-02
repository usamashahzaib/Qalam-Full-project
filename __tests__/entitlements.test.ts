import { describe, it, expect } from "vitest"
import {
  canAccessPlan,
  getPlanLimits,
  getPlanSummary,
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
    expect(canAccessPlan("Agency Starter", "Agency Starter")).toBe(true)
    expect(canAccessPlan("Agency Growth", "Agency Growth")).toBe(true)
  })

  it("allows higher tier to access lower tier features", () => {
    expect(canAccessPlan("Pro", "Free")).toBe(true)
    expect(canAccessPlan("Pro", "Solo")).toBe(true)
    expect(canAccessPlan("Agency Growth", "Pro")).toBe(true)
    expect(canAccessPlan("Agency Starter", "Solo")).toBe(true)
    expect(canAccessPlan("Agency Growth", "Agency Starter")).toBe(true)
  })

  it("blocks lower tier from higher tier features", () => {
    expect(canAccessPlan("Free", "Solo")).toBe(false)
    expect(canAccessPlan("Free", "Pro")).toBe(false)
    expect(canAccessPlan("Solo", "Pro")).toBe(false)
    expect(canAccessPlan("Pro", "Agency Starter")).toBe(false)
    expect(canAccessPlan("Agency Starter", "Agency Growth")).toBe(false)
  })

  it("returns false for unknown plan names", () => {
    expect(canAccessPlan("Unknown", "Free")).toBe(false)
    expect(canAccessPlan("", "Free")).toBe(false)
    expect(canAccessPlan("premium", "Solo")).toBe(false)
  })
})

describe("getPlanLimits", () => {
  it("Free: correct limits", () => {
    const limits = getPlanLimits("Free")
    expect(limits.aiDraftsPerMonth).toBe(5)
    expect(limits.carouselGenerationsPerMonth).toBe(0)
    expect(limits.linkedinPublish).toBe(false)
    expect(limits.scheduling).toBe(false)
    expect(limits.approvals).toBe(false)
    expect(limits.canExport).toBe(false)
    expect(limits.analyticsDepth).toBe("basic")
    expect(limits.seats).toBe(1)
  })

  it("Solo: correct limits", () => {
    const limits = getPlanLimits("Solo")
    expect(limits.aiDraftsPerMonth).toBe(50)
    expect(limits.linkedinPublish).toBe(true)
    expect(limits.scheduling).toBe(true)
    expect(limits.approvals).toBe(false)
    expect(limits.canExport).toBe(false)
    expect(limits.analyticsDepth).toBe("full")
    expect(limits.carouselGenerationsPerMonth).toBe(3)
  })

  it("Pro: unlimited drafts, approvals, export", () => {
    const limits = getPlanLimits("Pro")
    expect(limits.aiDraftsPerMonth).toBe("unlimited")
    expect(limits.approvals).toBe(true)
    expect(limits.canExport).toBe(true)
    expect(limits.researchRunsPerMonth).toBe(5)
    expect(limits.clientWorkspaces).toBe(0)
  })

  it("Agency Starter: 3 client workspaces, 5 seats", () => {
    const limits = getPlanLimits("Agency Starter")
    expect(limits.clientWorkspaces).toBe(3)
    expect(limits.seats).toBe(5)
    expect(limits.aiDraftsPerMonth).toBe("unlimited")
  })

  it("Agency Growth: everything unlimited", () => {
    const limits = getPlanLimits("Agency Growth")
    expect(limits.aiDraftsPerMonth).toBe("unlimited")
    expect(limits.clientWorkspaces).toBe("unlimited")
    expect(limits.seats).toBe("unlimited")
    expect(limits.carouselGenerationsPerMonth).toBe("unlimited")
    expect(limits.researchRunsPerMonth).toBe("unlimited")
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
    expect(formatLimit(50)).toBe("50")
    expect(formatLimit(3)).toBe("3")
  })
})

describe("getPlanSummary", () => {
  it("Free: shows draft cap and no carousel", () => {
    const summary = getPlanSummary("Free")
    expect(summary).toContain("10 AI drafts/month")
    expect(summary).toContain("No carousel generation")
    expect(summary).not.toContain("LinkedIn publish")
  })

  it("Solo: shows draft cap and carousel count", () => {
    const summary = getPlanSummary("Solo")
    expect(summary).toContain("50 AI drafts/month")
    expect(summary).toContain("3 carousels/month")
    expect(summary).toContain("LinkedIn publish")
    expect(summary).toContain("Post scheduling")
  })

  it("Pro: unlimited drafts, approvals, no client workspaces", () => {
    const summary = getPlanSummary("Pro")
    expect(summary).toContain("Unlimited AI drafts")
    expect(summary).toContain("Approval workflow")
    expect(summary).not.toContain("client workspace")
  })

  it("Agency Starter: shows 3 client workspaces", () => {
    const summary = getPlanSummary("Agency Starter")
    expect(summary).toContain("3 client workspaces")
  })

  it("Agency Growth: unlimited workspaces and carousels", () => {
    const summary = getPlanSummary("Agency Growth")
    expect(summary).toContain("Unlimited client workspaces")
    expect(summary).toContain("Unlimited carousels")
  })
})

describe("PLAN_ORDER and PLAN_HIERARCHY integrity", () => {
  it("has all five plans in ascending order", () => {
    expect(PLAN_ORDER).toEqual(["Free", "Solo", "Pro", "Agency Starter", "Agency Growth"])
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
