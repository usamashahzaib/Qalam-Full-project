import { describe, expect, it } from "vitest"
import { CAREER_PLAN_CONFIG, getCareerEntitlements } from "@/lib/career-entitlements"

describe("career plan entitlements", () => {
  it("keeps the free acquisition loop useful and bounded", () => {
    expect(CAREER_PLAN_CONFIG.Free.targetedResumesPerMonth).toBe(1)
    expect(CAREER_PLAN_CONFIG.Free.activeApplications).toBe(10)
    expect(CAREER_PLAN_CONFIG.Free.evidenceItems).toBe(15)
    expect(CAREER_PLAN_CONFIG.Free.outcomeTracking).toBe(true)
    expect(CAREER_PLAN_CONFIG.Free.recruiterSearch).toBe(false)
  })

  it("increases career capacity monotonically", () => {
    expect(CAREER_PLAN_CONFIG.Solo.targetedResumesPerMonth).toBeGreaterThan(CAREER_PLAN_CONFIG.Free.targetedResumesPerMonth)
    expect(CAREER_PLAN_CONFIG.Pro.targetedResumesPerMonth).toBeGreaterThan(CAREER_PLAN_CONFIG.Solo.targetedResumesPerMonth)
    expect(CAREER_PLAN_CONFIG.Pro.advancedOutcomeInsights).toBe(true)
    expect(CAREER_PLAN_CONFIG.Pro.recruiterSearch).toBe(true)
  })

  it("falls back safely to Free", () => {
    expect(getCareerEntitlements("unknown")).toEqual(CAREER_PLAN_CONFIG.Free)
  })
})
