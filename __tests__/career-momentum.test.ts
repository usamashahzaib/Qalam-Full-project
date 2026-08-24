import { describe, expect, it } from "vitest"
import {
  calculateCurrentStreak,
  calculateMomentumScore,
  calculateProfileCompletion,
  localDateKeys,
  toLocalDateKey,
} from "@/lib/career-momentum"

describe("career momentum", () => {
  const now = new Date("2026-08-24T18:00:00.000Z")

  it("uses the browser timezone offset for the local signal date", () => {
    expect(toLocalDateKey(now, -300)).toBe("2026-08-24")
    expect(toLocalDateKey(new Date("2026-08-24T22:00:00.000Z"), -300)).toBe("2026-08-25")
  })

  it("keeps yesterday's streak alive until the current day ends", () => {
    const dates = localDateKeys(4, 0, now)
    expect(calculateCurrentStreak([dates[1], dates[2], dates[3]], 0, now)).toBe(3)
    expect(calculateCurrentStreak([dates[0], dates[1]], 0, now)).toBe(2)
  })

  it("stops a streak at the first missing activity date", () => {
    const dates = localDateKeys(5, 0, now)
    expect(calculateCurrentStreak([dates[0], dates[1], dates[3]], 0, now)).toBe(2)
  })

  it("caps outcome-linked momentum at 100", () => {
    const result = calculateMomentumScore({
      signalCount: 100,
      evidenceCount: 100,
      documentedEvidenceCount: 100,
      profileCompletion: 100,
      publishedPostsLast30Days: 100,
      activeApplications: 100,
      interviews: 100,
      activeDaysLast7: 7,
    })
    expect(result.score).toBe(100)
    expect(result.breakdown).toEqual({ proof: 35, profile: 15, visibility: 25, pipeline: 15, consistency: 10 })
  })

  it("does not manufacture momentum for an empty account", () => {
    expect(calculateMomentumScore({
      signalCount: 0,
      evidenceCount: 0,
      documentedEvidenceCount: 0,
      profileCompletion: 0,
      publishedPostsLast30Days: 0,
      activeApplications: 0,
      interviews: 0,
      activeDaysLast7: 0,
    }).score).toBe(0)
  })

  it("measures profile completion from real saved fields", () => {
    expect(calculateProfileCompletion(null)).toBe(0)
    expect(calculateProfileCompletion({
      target_role: "Product designer",
      target_industry: "SaaS",
      summary: "Designs complex systems.",
      skills: ["Research", "Systems", "Prototyping"],
      achievements: [{ title: "Shipped onboarding" }],
    })).toBe(100)
  })
})
