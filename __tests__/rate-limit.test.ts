import { describe, it, expect, vi, beforeEach } from "vitest"

const limitMock = vi.fn()

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    constructor() {}
  },
}))

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class MockRatelimit {
    static slidingWindow() {
      return {}
    }
    limit = limitMock
    constructor() {}
  },
}))

describe("checkRateLimit", () => {
  beforeEach(() => {
    limitMock.mockReset()
  })

  it("blocks when IP limit is exceeded (fail closed on IP)", async () => {
    limitMock.mockResolvedValueOnce({ success: false, limit: 30, remaining: 0, reset: 1000 })
    const { checkRateLimit } = await import("@/lib/server/rate-limit")
    const result = await checkRateLimit("user-1", "Pro", "1.2.3.4")
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(30)
  })

  it("allows when IP and plan limits pass", async () => {
    limitMock
      .mockResolvedValueOnce({ success: true, limit: 30, remaining: 29, reset: 1000 })
      .mockResolvedValueOnce({ success: true, limit: 20, remaining: 19, reset: 2000 })
    const { checkRateLimit } = await import("@/lib/server/rate-limit")
    const result = await checkRateLimit("user-1", "Pro", "1.2.3.4")
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(20)
    expect(result.remaining).toBe(19)
  })

  it("fails closed when Redis throws", async () => {
    limitMock.mockRejectedValueOnce(new Error("redis_down"))
    const { checkRateLimit } = await import("@/lib/server/rate-limit")
    const result = await checkRateLimit("user-1", "Free", "1.2.3.4")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
