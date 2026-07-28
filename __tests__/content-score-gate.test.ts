import { describe, expect, it } from "vitest"
import { contentScoreCap, freeTierAttemptCap, gateScores, MIN_READY_CONTENT_SCORE } from "@/lib/content-score-gate"

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

  it("keeps the first complete free-plan draft at the ready-content floor", () => {
    expect(freeTierAttemptCap(1)).toBe(MIN_READY_CONTENT_SCORE)
    expect(gateScores(completeContent, highScores, freeTierAttemptCap(1)).overall).toBe(MIN_READY_CONTENT_SCORE)
  })

  it("allows up to 90 after one regenerate", () => {
    expect(freeTierAttemptCap(2)).toBe(90)
    expect(gateScores(completeContent, highScores, freeTierAttemptCap(2)).overall).toBe(90)
  })

  it("removes the cap after two regenerates", () => {
    expect(freeTierAttemptCap(3)).toBe(100)
    expect(gateScores(completeContent, highScores, freeTierAttemptCap(3)).overall).toBe(96)
  })

  it("still respects the quality cap even when the attempt cap is higher", () => {
    const thin = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ")
    expect(gateScores(thin, highScores, freeTierAttemptCap(3)).overall).toBe(68)
  })

  it("floors a complete scored draft at 82 without inflating unfinished content", () => {
    const lowScores = { ...highScores, overall: 79 }
    expect(gateScores(completeContent, lowScores).overall).toBe(MIN_READY_CONTENT_SCORE)
  })
})
