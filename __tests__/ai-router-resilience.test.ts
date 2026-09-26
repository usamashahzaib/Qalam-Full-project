import { beforeEach, describe, expect, it, vi } from "vitest"
import { callGemini } from "@/lib/server/gemini-client"
import { callGroq } from "@/lib/server/groq-client"
import { callOpenRouter } from "@/lib/server/openrouter-client"
import { recordFailure } from "@/lib/server/circuit-breaker"

vi.mock("@/lib/server/gemini-client", () => ({ callGemini: vi.fn() }))
vi.mock("@/lib/server/groq-client", () => ({ callGroq: vi.fn() }))
vi.mock("@/lib/server/openrouter-client", () => ({ callOpenRouter: vi.fn().mockRejectedValue(new Error("OpenRouter API key not configured")) }))
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
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: vi.fn(), sanitizeOrFilterValue: vi.fn((value: string) => value) }))
vi.mock("@/lib/server/logging", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/server/env", () => ({ env: { aiDailySpendCapUsd: 0 } }))

const mockGemini = vi.mocked(callGemini)
const mockGroq = vi.mocked(callGroq)
const mockOpenRouter = vi.mocked(callOpenRouter)
const { callAi, classifyAiError, retryAfterMs } = await import("@/lib/server/ai-router-v2")
const ok = (content: string) => ({ content, tokensIn: 1, tokensOut: 1, model: "openai/gpt-oss-20b" })
const TPM = "groq API error: 429 - Rate limit reached for model openai/gpt-oss-20b on tokens per minute (TPM): Limit 8000, Used 7200, Requested 3700. Please try again in 1.2s."

describe("error classification", () => {
  it("treats unusable output as bad output, not a broken provider", () => {
    expect(classifyAiError("groq API error: 400 - {\"error\":{\"code\":\"json_validate_failed\",\"failed_generation\":\"\"}}")).toBe("bad-output")
    expect(classifyAiError("groq returned empty response")).toBe("bad-output")
    expect(classifyAiError(TPM)).toBe("rate-limit")
    expect(classifyAiError("Gemini API key not configured")).toBe("config")
  })

  it("reads the retry delay from a throttle message", () => {
    expect(retryAfterMs(TPM)).toBe(1200)
    expect(retryAfterMs("Please try again in 1m30.5s")).toBe(90500)
    expect(retryAfterMs("Please try again in 450ms")).toBe(450)
    expect(retryAfterMs("quota exceeded for the day")).toBeNull()
  })
})

describe("provider resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpenRouter.mockRejectedValue(new Error("OpenRouter API key not configured"))
    mockGemini.mockRejectedValue(new Error("gemini API error: 429 - quota exceeded"))
  })

  it("waits out a short per-minute throttle instead of dropping the provider", async () => {
    vi.useFakeTimers()
    mockGroq.mockRejectedValueOnce(new Error(TPM)).mockResolvedValueOnce(ok("a post"))
    const pending = callAi("post-generation", "system", "user", { cache: false, humanWriting: false })
    await vi.advanceTimersByTimeAsync(2000)
    await expect(pending).resolves.toBe("a post")
    expect(recordFailure).not.toHaveBeenCalledWith("groq")
    vi.useRealTimers()
  })

  it("does not open the circuit breaker for a throttle or for bad output", async () => {
    vi.useFakeTimers()
    mockGroq.mockRejectedValue(new Error(TPM))
    const throttled = callAi("post-generation", "system", "user", { cache: false, humanWriting: false }).catch(() => "failed")
    await vi.advanceTimersByTimeAsync(10_000)
    await throttled
    mockGroq.mockRejectedValue(new Error("groq returned empty response"))
    await callAi("post-generation", "system", "user", { cache: false, humanWriting: false }).catch(() => "failed")
    expect(recordFailure).not.toHaveBeenCalledWith("groq")
    expect(mockGroq.mock.calls.length).toBe(2 + 2)
    vi.useRealTimers()
  })

  it("waits out the 10-15s delays Groq asks for under its per-minute limit", async () => {
    vi.useFakeTimers()
    mockGroq.mockRejectedValueOnce(new Error(TPM.replace("1.2s", "12.743s"))).mockResolvedValueOnce(ok("a score"))
    const pending = callAi("post-scoring", "system", "user", { cache: false, humanWriting: false })
    await vi.advanceTimersByTimeAsync(14_000)
    await expect(pending).resolves.toBe("a score")
    vi.useRealTimers()
  })

  it("falls through to the next provider when one returns nothing", async () => {
    mockGroq.mockResolvedValue(ok("   "))
    mockGemini.mockResolvedValue("a post from gemini")
    await expect(callAi("post-generation", "system", "user", { cache: false, humanWriting: false })).resolves.toBe("a post from gemini")
  })

  it("still counts a quota that is actually exhausted", async () => {
    mockGroq.mockRejectedValue(new Error("groq API error: 429 - daily quota exceeded"))
    await callAi("post-generation", "system", "user", { cache: false, humanWriting: false }).catch(() => "failed")
    expect(recordFailure).toHaveBeenCalledWith("groq")
  })
})
