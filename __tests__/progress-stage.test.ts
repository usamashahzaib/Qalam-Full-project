import { describe, expect, it } from "vitest"
import { progressStageFromScore } from "@/lib/career-momentum"

describe("progress stage", () => {
  it("maps a progress score onto thirteen visible segments", () => {
    expect(progressStageFromScore(0)).toBe(0)
    expect(progressStageFromScore(1)).toBe(1)
    expect(progressStageFromScore(50)).toBe(7)
    expect(progressStageFromScore(100)).toBe(13)
  })

  it("keeps invalid and out-of-range scores safe", () => {
    expect(progressStageFromScore(-10)).toBe(0)
    expect(progressStageFromScore(150)).toBe(13)
    expect(progressStageFromScore(Number.NaN)).toBe(0)
  })
})
