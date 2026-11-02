import { beforeEach, describe, expect, it, vi } from "vitest"
import { callOpenAiCompatible } from "@/lib/server/openai-compatible-client"

vi.mock("@/lib/server/openai-compatible-client", () => ({ callOpenAiCompatible: vi.fn() }))
const mockCall = vi.mocked(callOpenAiCompatible)
const { callNvidia } = await import("@/lib/server/nvidia-client")

const ok = (content: string, model: string) => ({ content, tokensIn: 1, tokensOut: 1, model })

describe("NVIDIA model chain", () => {
  beforeEach(() => mockCall.mockReset())

  it("moves to the next model when one is throttled or gone", async () => {
    mockCall
      .mockRejectedValueOnce(new Error("NVIDIA API error: 429 - Too Many Requests"))
      .mockRejectedValueOnce(new Error("NVIDIA API error: 404 - model not found"))
      .mockResolvedValueOnce(ok("from glm", "z-ai/glm-5.3-flash"))

    await expect(callNvidia("s", "u", { model: "a/kimi, b/nemotron ,z-ai/glm-5.3-flash" })).resolves.toMatchObject({ content: "from glm" })
    expect(mockCall.mock.calls.map(([options]) => options.model)).toEqual(["a/kimi", "b/nemotron", "z-ai/glm-5.3-flash"])
  })

  it("stops on a key problem instead of burning through the chain", async () => {
    mockCall.mockRejectedValueOnce(new Error("NVIDIA API key not configured"))
    await expect(callNvidia("s", "u", { model: "a/one,b/two" })).rejects.toThrow("not configured")
    expect(mockCall).toHaveBeenCalledTimes(1)
  })

  it("drops inline reasoning and treats a thinking-only answer as empty", async () => {
    mockCall
      .mockResolvedValueOnce(ok("<think>planning</think>", "a/one"))
      .mockResolvedValueOnce(ok("<think>plan</think>\nThe post.", "b/two"))
    await expect(callNvidia("s", "u", { model: "a/one,b/two" })).resolves.toMatchObject({ content: "The post.", model: "b/two" })
  })
})
