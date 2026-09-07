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
  it("keeps unfinished drafts from reaching 90", () => {
    const gated = gateScores("Just a hook.", highScores)
    expect(gated.overall).toBe(35)
    expect(gated.hook).toBe(35)
    expect(gated.tips.overall).toMatch(/actual post/i)
  })

  it("caps thin drafts below copy-ready range", () => {
    const content = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ")
    expect(gateScores(content, highScores).overall).toBe(68)
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

  it("still respects the quality cap even when the attempt cap is higher", () => {
    const thin = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ")
    expect(gateScores(thin, highScores, freeTierAttemptCap(3)).overall).toBe(68)
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
