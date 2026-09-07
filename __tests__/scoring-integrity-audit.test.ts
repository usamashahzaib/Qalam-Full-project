import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ call: vi.fn() }))
vi.mock("@/lib/server/ai-router-v2", () => ({ callAi: mocks.call, safeParseJson: (raw: string) => { try { return JSON.parse(raw) } catch { return null } } }))
vi.mock("@/lib/server/voice-profile", () => ({ getWorkspaceVoiceProfile: vi.fn() }))
import { scorePost } from "@/lib/use-cases/score-post"

const input = { content: "A specific thought with enough context to be evaluated.\n\nA second thought.", userId: "user", plan: "Free" }
const dimensions = (n: number) => ({ hook: n, readability: n, authority: n, specificity: n, cta: n, human: n, voiceFit: n })

describe("scoring evaluation integrity", () => {
  beforeEach(() => vi.clearAllMocks())
  it("returns an unavailable result instead of fabricated scores on provider failure", async () => {
    mocks.call.mockRejectedValue(new Error("offline"))
    const result = await scorePost(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("AI_UNAVAILABLE")
  })
  it("rejects incomplete numeric dimensions", async () => {
    mocks.call.mockResolvedValue(JSON.stringify({ hook: 99, overall: 99 }))
    expect((await scorePost(input)).ok).toBe(false)
  })
  it("does not multiply legitimately low scores or trust an inconsistent overall", async () => {
    mocks.call.mockResolvedValue(JSON.stringify({ ...dimensions(7), overall: 95 }))
    const result = await scorePost(input)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.overall).toBe(7)
  })
})
