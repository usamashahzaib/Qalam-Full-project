import { describe, it, expect, vi, beforeEach } from "vitest"
import { getRedis } from "@/lib/server/redis"
import { checkRateLimit } from "@/lib/server/rate-limit"

vi.mock("@/lib/server/redis", () => ({
  getRedis: vi.fn(),
}))

const mockGetRedis = vi.mocked(getRedis)

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("allows request when bucket has tokens (fresh key)", async () => {
    mockGetRedis.mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    } as never)

    const result = await checkRateLimit("route", "pro", "1.2.3.4")
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(20)
  })

  it("blocks request when bucket is empty", async () => {
    mockGetRedis.mockReturnValue({
      get: vi.fn().mockResolvedValue({ tokens: 0, lastRefill: Date.now() }),
      set: vi.fn().mockResolvedValue("OK"),
    } as never)

    const result = await checkRateLimit("route", "pro", "1.2.3.4")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("fails closed when Redis throws", async () => {
    mockGetRedis.mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error("redis_down")),
      set: vi.fn(),
    } as never)

    const result = await checkRateLimit("route", "free", "1.2.3.4")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
