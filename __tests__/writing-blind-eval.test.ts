import { describe, expect, it } from "vitest"
// @ts-expect-error The standalone evaluation tool is also executable with plain Node.
import { createBlindPack, scoreBlindPack } from "../scripts/writing-blind-eval.mjs"

describe("blind writing evaluation", () => {
  it("hides model identity, scores either ordering, and rejects altered material", () => {
    for (const swap of [true, false]) {
      const pack = createBlindPack([{ id: "one", brief: "Explain backups", facts: "No personal facts", baseline: "Old output", candidate: "New output" }], () => swap)
      expect(pack.review[0].candidate).toBeUndefined()
      const review = { ...pack.review[0], winner: swap ? "A" : "B", reason: "The action is clearer.", factualErrorsA: 0, factualErrorsB: 0, voiceScoreA: 4, voiceScoreB: 4, editMinutesA: 1, editMinutesB: 1 }
      expect(scoreBlindPack([review], pack.key).candidateWins).toBe(1)
      expect(() => scoreBlindPack([{ ...review, A: "Changed" }], pack.key)).toThrow("changed")
      expect(() => scoreBlindPack([{ ...review, voiceScoreA: null }], pack.key)).toThrow("voice")
      expect(() => scoreBlindPack([review, review], pack.key)).toThrow("duplicate")
    }
  })
})
