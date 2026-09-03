import { describe, expect, it } from "vitest"
import { formatScoreLabel, normalizeScoreBreakdown, normalizeScoredFreeToolResult, toHundredPointScore } from "@/lib/free-tool-scores"

describe("free tool score normalization", () => {
  it("converts ten-point and fractional scores to the displayed hundred-point scale", () => {
    expect(toHundredPointScore(7.2)).toBe(72)
    expect(toHundredPointScore(7.5)).toBe(75)
    expect(toHundredPointScore(0.72)).toBe(72)
    expect(toHundredPointScore(72)).toBe(72)
    expect(toHundredPointScore(150)).toBe(100)
  })

  it("normalizes the overall score and every breakdown value before returning a result", () => {
    expect(normalizeScoredFreeToolResult({ content_readiness_score: 7.2, score_breakdown: { hook: 6, audience_relevance: 8 } }, "content_readiness_score", "score_breakdown")).toEqual({
      content_readiness_score: 72,
      score_breakdown: { hook: 60, audience_relevance: 80 },
    })
    expect(normalizeScoreBreakdown({ discussion_potential: 7.5 })).toEqual({ discussion_potential: 75 })
  })

  it("turns API field names into readable labels", () => {
    expect(formatScoreLabel("audience_relevance")).toBe("Audience Relevance")
    expect(formatScoreLabel("discussion-potential")).toBe("Discussion Potential")
  })
})
