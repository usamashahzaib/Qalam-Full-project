import { describe, expect, it } from "vitest"
import { rankVoiceExamples } from "@/lib/server/embeddings"

describe("voice example relevance", () => {
  it("prefers examples that overlap the current writing request", () => {
    const examples = [
      "A general note about leadership meetings and team morale.",
      "We shortened the hiring process by removing two interview stages.",
      "A practical breakdown of resume evidence and recruiter decisions.",
    ]

    expect(rankVoiceExamples(examples, "How recruiter evidence improves a resume", 2)).toEqual([
      examples[2],
      examples[0],
    ])
  })

  it("preserves saved order when no useful query exists", () => {
    const examples = ["First saved writing example with enough detail.", "Second saved writing example with enough detail."]
    expect(rankVoiceExamples(examples, undefined, 1)).toEqual([examples[0]])
  })
})
