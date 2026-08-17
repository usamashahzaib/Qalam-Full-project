import { describe, expect, it } from "vitest"
import { buildResumeReviewPrompt, normalizeResumeReview, RESUME_REVIEW_SCORE_KEYS } from "@/lib/career-resume-review"

describe("ATS resume checker", () => {
  it("covers the full recruiter scorecard", () => {
    expect(RESUME_REVIEW_SCORE_KEYS).toHaveLength(8)
    const prompt = buildResumeReviewPrompt("resume content", "job content")
    expect(prompt).toContain("Six-second recruiter read")
    expect(prompt).toContain("Career progression")
    expect(prompt).toContain("protected characteristics")
  })

  it("bounds scores and preserves structured findings", () => {
    const result = normalizeResumeReview({
      overall_score: 120,
      scores: Object.fromEntries(RESUME_REVIEW_SCORE_KEYS.map((key) => [key, 75])),
      verdict: "Review complete",
      screening_decision: "Possible shortlist",
      recruiter_read: {},
      risks: [{ severity: "high", issue: "Weak evidence", why: "Claims lack proof" }],
      missing_keywords: [{ keyword: "Forecasting", evidence_status: "unclear" }],
      priority_fixes: [{ section: "Experience", action: "Add scope", example: "State team size" }],
    })
    expect(result?.overall_score).toBe(75)
    expect(result?.scores.ats_parsing).toBe(75)
    expect(result?.risks[0].severity).toBe("high")
  })
})
