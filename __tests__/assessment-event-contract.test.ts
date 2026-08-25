import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { normalizeResumeReview, parseResumeReviewResponse, RESUME_REVIEW_SCORE_KEYS } from "@/lib/career-resume-review"

const tool = readFileSync(resolve(process.cwd(), "components/tools/AtsResumeCheckerTool.tsx"), "utf8")

const completeReview = () => ({
  overall_score: 82,
  scores: Object.fromEntries(RESUME_REVIEW_SCORE_KEYS.map((key) => [key, 82])),
  verdict: "Review complete",
  screening_decision: "Possible shortlist",
  recruiter_read: {},
  risks: [],
  missing_keywords: [],
  priority_fixes: [],
})

describe("assessment_complete contract", () => {
  it("rejects a body that is not a review object, so no event can be emitted from it", () => {
    expect(parseResumeReviewResponse(null)).toBeNull()
    expect(parseResumeReviewResponse(undefined)).toBeNull()
    expect(parseResumeReviewResponse("ok")).toBeNull()
    expect(parseResumeReviewResponse([])).toBeNull()
  })

  it("rejects an error envelope returned with a success status", () => {
    expect(parseResumeReviewResponse({ error: "temporarily unavailable" })).toBeNull()
  })

  it("rejects a truncated review that would band as at_risk from a missing score", () => {
    expect(parseResumeReviewResponse({ verdict: "partial" })).toBeNull()
    expect(parseResumeReviewResponse({ overall_score: 70 })).toBeNull()
    const missingOneFactor = completeReview()
    delete (missingOneFactor.scores as Record<string, unknown>).clarity
    expect(parseResumeReviewResponse(missingOneFactor)).toBeNull()
  })

  it("accepts a complete review and keeps the normalized weighted score", () => {
    const review = parseResumeReviewResponse(completeReview())
    expect(review?.overall_score).toBe(82)
    expect(review?.scores.clarity).toBe(82)
  })

  it("leaves the lenient server-side normalizer unchanged for model output repair", () => {
    expect(normalizeResumeReview(completeReview())?.overall_score).toBe(82)
    expect(normalizeResumeReview(null)).toBeNull()
  })

  it("gates the event on the normalized review, not on the raw response body", () => {
    expect(tool).toContain("const review = parseResumeReviewResponse(data)")
    expect(tool).toContain("if (!review) throw new Error")
    expect(tool).toContain("score_band: scoreBand(review.overall_score)")
    // The raw body must not be rendered as a result or used for the score band.
    expect(tool).not.toContain("setResult(data)")
    expect(tool).not.toContain("data.overall_score")
  })

  it("sends no free-text resume or job description content as event properties", () => {
    const eventBlock = tool.slice(tool.indexOf('trackMarketingEvent("assessment_complete"'))
    const properties = eventBlock.slice(0, eventBlock.indexOf("})"))
    expect(properties).not.toContain("resumeText")
    expect(properties).toContain("job_description_supplied: jobDescription.trim().length > 0")
  })
})

describe("assessment result announcement", () => {
  const source = readFileSync(resolve(process.cwd(), "components/tools/AtsResumeCheckerTool.tsx"), "utf8")

  it("keeps the status live region mounted independently of the result", () => {
    // A live region rendered inside `{result ? ... : null}` is created in the
    // same render as its content and is not reliably announced.
    expect(source).toContain('<p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>')
    const resultsContainer = source.slice(source.indexOf("{result ? ("))
    expect(resultsContainer.slice(0, 200)).not.toContain("aria-live")
  })

  it("announces the loading and completed states, not just the result markup", () => {
    expect(source).toContain("Checking your resume")
    expect(source).toContain("Review complete. Readiness score")
  })

  it("still associates upload and request errors with an alert role", () => {
    expect(source).toContain('role="alert"')
  })
})
