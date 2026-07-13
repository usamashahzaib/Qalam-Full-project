import { describe, it, expect, vi, beforeEach } from "vitest"
import { getRedis } from "@/lib/server/redis"

vi.mock("@/lib/server/redis", () => ({
  getRedis: vi.fn(),
}))

const mockGetRedis = vi.mocked(getRedis)

// Import after mock is set up
const { checkGenerationRateLimit } = await import("@/lib/server/queue")

describe("checkGenerationRateLimit (per-plan generation limit)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("falls back to in-memory limiter when Redis is unavailable and allows a fresh user", async () => {
    mockGetRedis.mockReturnValue(null)

    const result = await checkGenerationRateLimit("user-no-redis", "Solo")
    expect(result.allowed).toBe(true)
    expect(typeof result.remaining).toBe("number")
  })

  it("blocks once the in-memory bucket for a Free-plan user is exhausted (5/hr)", async () => {
    mockGetRedis.mockReturnValue(null)

    let last
    for (let i = 0; i < 6; i += 1) {
      last = await checkGenerationRateLimit("user-free-exhaust", "Free")
    }
    expect(last!.allowed).toBe(false)
    expect(last!.remaining).toBe(0)
  })

  it("Agency plan has a very high limit (9999/hr) via in-memory fallback", async () => {
    mockGetRedis.mockReturnValue(null)

    const result = await checkGenerationRateLimit("agency-user", "Agency")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(9000)
  })

  it("fails closed when Redis errors", async () => {
    // A Redis client with no usable methods forces @upstash/ratelimit to throw,
    // which checkGenerationRateLimit must translate into a denied request.
    mockGetRedis.mockReturnValue({} as never)

    const result = await checkGenerationRateLimit("user-abc", "Pro")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
