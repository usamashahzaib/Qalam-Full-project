import { describe, expect, it } from "vitest"
import {
  contentScoreCap,
  freeTierAttemptCap,
  gateScores,
  isReadyContentScore,
} from "@/lib/content-score-gate"

const highScores = {
  hook: 96,
  readability: 96,
  authority: 96,
  specificity: 96,
  cta: 96,
  human: 96,
  voiceFit: 96,
  overall: 96,
  tips: {},
  hashtags: [],
}

describe("contentScoreCap", () => {
  it("does not give an empty draft a publish-ready score", () => {
    const gated = gateScores("  ", highScores)
    expect(gated.overall).toBe(0)
    expect(gated.hook).toBe(0)
    expect(gated.tips.overall).toMatch(/write a post/i)
  })

  it("does not force a short evaluated post to add filler to reach 80 words", () => {
    const content = "The launch moved to Friday. Existing appointments stay unchanged. If you booked a demo, your invitation still has the right time."
    expect(gateScores(content, highScores).overall).toBe(96)
  })

  it("allows complete, structured drafts to keep earned scores", () => {
    const line = "This is a concrete sentence with a real example and clear context."
    const content = Array.from({ length: 10 }, () => line).join("\n\n")
    expect(contentScoreCap(content).max).toBe(100)
    expect(gateScores(content, highScores).overall).toBe(96)
  })
})

describe("freeTierAttemptCap", () => {
  const line = "This is a concrete sentence with a real example and clear context."
  const completeContent = Array.from({ length: 10 }, () => line).join("\n\n")

  it("keeps the earned score on the first attempt", () => {
    expect(freeTierAttemptCap(1)).toBe(100)
    expect(gateScores(completeContent, highScores, freeTierAttemptCap(1)).overall).toBe(96)
  })

  it("does not change the cap after regeneration", () => {
    expect(freeTierAttemptCap(2)).toBe(100)
    expect(gateScores(completeContent, highScores, freeTierAttemptCap(2)).overall).toBe(96)
  })

  it("removes the cap after two regenerates", () => {
    expect(freeTierAttemptCap(3)).toBe(100)
    expect(gateScores(completeContent, highScores, freeTierAttemptCap(3)).overall).toBe(96)
  })

  it("still prevents oversized posts from meeting the ready threshold", () => {
    expect(gateScores("word ".repeat(650), highScores, freeTierAttemptCap(3)).overall).toBe(81)
  })

  it("does not promote an unready evaluation to the publishing threshold", () => {
    const lowScores = { ...highScores, overall: 79 }
    expect(gateScores(completeContent, lowScores).overall).toBe(79)
    expect(isReadyContentScore(gateScores(completeContent, lowScores).overall)).toBe(false)
  })
})

describe("isReadyContentScore", () => {
  it.each([82, 90, 100])("accepts a publish-ready score: %s", (score) => {
    expect(isReadyContentScore(score)).toBe(true)
  })

  it.each([undefined, null, 81, 101, Number.NaN, "90"])("rejects an invalid or unready score: %s", (score) => {
    expect(isReadyContentScore(score)).toBe(false)
  })
})
