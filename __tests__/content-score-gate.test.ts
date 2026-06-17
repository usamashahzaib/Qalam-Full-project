import { describe, expect, it } from "vitest"
import { contentScoreCap, gateScores } from "@/lib/content-score-gate"

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
