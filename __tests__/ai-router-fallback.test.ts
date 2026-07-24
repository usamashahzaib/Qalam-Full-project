import { beforeEach, describe, expect, it, vi } from "vitest"
import { callGemini } from "@/lib/server/gemini-client"
import { callGroq } from "@/lib/server/groq-client"
import { callMistral } from "@/lib/server/mistral-client"

vi.mock("@/lib/server/gemini-client", () => ({ callGemini: vi.fn() }))
vi.mock("@/lib/server/groq-client", () => ({ callGroq: vi.fn() }))
vi.mock("@/lib/server/mistral-client", () => ({ callMistral: vi.fn() }))
vi.mock("@/lib/server/queue", () => ({
  checkAiRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  cacheAiResponse: vi.fn(),
  getCachedAiResponse: vi.fn().mockResolvedValue(null),
  hashPrompt: vi.fn().mockReturnValue("hash"),
}))
vi.mock("@/lib/server/circuit-breaker", () => ({
  checkCircuit: vi.fn().mockResolvedValue(true),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}))
vi.mock("@/lib/server/supabase-rest", () => ({
  createServiceClient: vi.fn(),
  sanitizeOrFilterValue: vi.fn((value: string) => value),
}))
vi.mock("@/lib/server/logging", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/server/env", () => ({ env: { aiDailySpendCapUsd: 0 } }))

const mockGemini = vi.mocked(callGemini)
const mockGroq = vi.mocked(callGroq)
const mockMistral = vi.mocked(callMistral)
const { callAi } = await import("@/lib/server/ai-router-v2")

const groqResult = {
  content: "groq response",
  tokensIn: 4,
  tokensOut: 3,
  model: "llama-3.1-8b-instant",
}

describe("AI provider fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGroq.mockResolvedValue(groqResult)
    mockGemini.mockResolvedValue("gemini response")
  })

  it("falls from Gemini to Groq for hook and CTA tasks", async () => {
    mockGemini.mockRejectedValue(new Error("Gemini API key not configured"))

    await expect(callAi("hook-generation", "system", "user", { cache: false })).resolves.toBe("groq response")
    await expect(callAi("cta-rewrite", "system", "user", { cache: false })).resolves.toBe("groq response")
    expect(mockGroq).toHaveBeenCalledTimes(2)
    expect(mockMistral).not.toHaveBeenCalled()
  })

  it("falls from Groq to Gemini for post, score, improve, and carousel tasks", async () => {
    mockGroq.mockRejectedValue(new Error("Groq API key not configured"))

    for (const task of ["post-generation", "post-scoring", "post-improvement", "carousel-outline"] as const) {
      await expect(callAi(task, "system", "user", { cache: false })).resolves.toBe("gemini response")
    }

    expect(mockGemini).toHaveBeenCalledTimes(4)
    expect(mockMistral).not.toHaveBeenCalled()
  })
})
