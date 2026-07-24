import { describe, it, expect, vi, beforeEach } from "vitest"
import { getRedis } from "@/lib/server/redis"
import { checkRateLimit, TokenBucket } from "@/lib/server/rate-limit"

vi.mock("@/lib/server/redis", () => ({
  getRedis: vi.fn(),
}))

const mockGetRedis = vi.mocked(getRedis)

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("allows a fresh key via the in-memory fallback when Redis is unavailable", async () => {
    mockGetRedis.mockReturnValue(null)

    const result = await checkRateLimit("route-a", "pro", "1.2.3.4")
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(20)
  })

  it("blocks once the in-memory bucket for a key is exhausted", async () => {
    mockGetRedis.mockReturnValue(null)

    let last
    for (let i = 0; i < 6; i += 1) {
      last = await checkRateLimit("route-b", "free", "9.9.9.9")
    }
    expect(last!.allowed).toBe(false)
    expect(last!.remaining).toBe(0)
  })

  it("fails closed when Redis errors", async () => {
    // A Redis client with no usable methods forces @upstash/ratelimit to throw,
    // which checkRateLimit must translate into a denied request.
    mockGetRedis.mockReturnValue({} as never)

    const result = await checkRateLimit("route-c", "free", "1.2.3.4")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe("checkFreeToolsGlobalBudget", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("degrades to a bounded in-memory fallback (not unlimited) when Redis is unconfigured", async () => {
    vi.stubEnv("FREE_TOOLS_FALLBACK_DAILY_CAP", "3")
    vi.resetModules()
    const { getRedis: freshGetRedis } = await import("@/lib/server/redis")
    vi.mocked(freshGetRedis).mockReturnValue(null)
    const { checkFreeToolsGlobalBudget: checkWithSmallCap } = await import("@/lib/server/rate-limit")

    expect(await checkWithSmallCap()).toBe(true)
    expect(await checkWithSmallCap()).toBe(true)
    expect(await checkWithSmallCap()).toBe(true)
    expect(await checkWithSmallCap()).toBe(false)

    vi.unstubAllEnvs()
  })

  it("degrades to the same bounded fallback (not unlimited) when Redis errors mid-call", async () => {
    vi.stubEnv("FREE_TOOLS_FALLBACK_DAILY_CAP", "2")
    vi.resetModules()
    const { getRedis: freshGetRedis } = await import("@/lib/server/redis")
    vi.mocked(freshGetRedis).mockReturnValue({ incr: vi.fn().mockRejectedValue(new Error("timeout")) } as never)
    const { checkFreeToolsGlobalBudget: checkWithSmallCap } = await import("@/lib/server/rate-limit")

    expect(await checkWithSmallCap()).toBe(true)
    expect(await checkWithSmallCap()).toBe(true)
    expect(await checkWithSmallCap()).toBe(false)

    vi.unstubAllEnvs()
  })
})

describe("TokenBucket", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("allows consumption via the in-memory fallback when Redis is unavailable", async () => {
    mockGetRedis.mockReturnValue(null)
    const bucket = new TokenBucket(3, 3, 60_000)
    expect(await bucket.tryConsume("bucket-key-a")).toBe(true)
  })

  it("denies once capacity is exhausted", async () => {
    mockGetRedis.mockReturnValue(null)
    const bucket = new TokenBucket(2, 2, 60_000)
    expect(await bucket.tryConsume("bucket-key-b")).toBe(true)
    expect(await bucket.tryConsume("bucket-key-b")).toBe(true)
    expect(await bucket.tryConsume("bucket-key-b")).toBe(false)
  })

  it("fails closed when Redis errors", async () => {
    mockGetRedis.mockReturnValue({} as never)
    const bucket = new TokenBucket(5, 5, 60_000)
    expect(await bucket.tryConsume("bucket-key-c")).toBe(false)
  })
})
