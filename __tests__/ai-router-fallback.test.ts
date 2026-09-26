import { beforeEach, describe, expect, it, vi } from "vitest"
import { callGemini } from "@/lib/server/gemini-client"
import { callGroq } from "@/lib/server/groq-client"
import { callOpenRouter } from "@/lib/server/openrouter-client"

vi.mock("@/lib/server/gemini-client", () => ({ callGemini: vi.fn() }))
vi.mock("@/lib/server/groq-client", () => ({ callGroq: vi.fn() }))
vi.mock("@/lib/server/openrouter-client", () => ({ callOpenRouter: vi.fn() }))
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
const mockOpenRouter = vi.mocked(callOpenRouter)
const { callAi } = await import("@/lib/server/ai-router-v2")

const groqResult = {
  content: "groq response",
  tokensIn: 4,
  tokensOut: 3,
  model: "openai/gpt-oss-20b",
}

const openRouterResult = {
  content: "free response",
  tokensIn: 4,
  tokensOut: 3,
  model: "openrouter/free",
}

describe("AI provider fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpenRouter.mockResolvedValue(openRouterResult)
    mockGroq.mockResolvedValue(groqResult)
    mockGemini.mockResolvedValue("gemini response")
  })

  it("leads with OpenRouter for every task", async () => {
    for (const task of ["hook-generation", "cta-rewrite", "post-generation", "post-scoring", "post-improvement", "carousel-outline"] as const) {
      await expect(callAi(task, "system", "user", { cache: false })).resolves.toBe("free response")
    }

    expect(mockOpenRouter).toHaveBeenCalledTimes(6)
    expect(mockGemini).not.toHaveBeenCalled()
    expect(mockGroq).not.toHaveBeenCalled()
  })

  it("falls from OpenRouter to Gemini when OpenRouter is unavailable", async () => {
    mockOpenRouter.mockRejectedValue(new Error("OpenRouter API key not configured"))

    await expect(callAi("hook-generation", "system", "user", { cache: false })).resolves.toBe("gemini response")
    await expect(callAi("cta-rewrite", "system", "user", { cache: false })).resolves.toBe("gemini response")
    expect(mockGemini).toHaveBeenCalledTimes(2)
    expect(mockGroq).not.toHaveBeenCalled()
  })

  it("falls from OpenRouter and Gemini to Groq for post, score, improve, and carousel tasks", async () => {
    mockOpenRouter.mockRejectedValue(new Error("OpenRouter API key not configured"))
    mockGemini.mockRejectedValue(new Error("Gemini API key not configured"))

    for (const task of ["post-generation", "post-scoring", "post-improvement", "carousel-outline"] as const) {
      await expect(callAi(task, "system", "user", { cache: false })).resolves.toBe("groq response")
    }

    expect(mockGroq).toHaveBeenCalledTimes(4)
  })

  it("does not retry a retired model response before falling back", async () => {
    mockOpenRouter.mockRejectedValue(new Error("OpenRouter API key not configured"))
    mockGemini.mockRejectedValue(new Error("Gemini API error: 404 model no longer available"))

    await expect(callAi("post-generation", "system", "user", { cache: false })).resolves.toBe("groq response")

    expect(mockGemini).toHaveBeenCalledTimes(1)
    expect(mockGroq).toHaveBeenCalledTimes(1)
  })
})
