import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getRedis } from "@/lib/server/redis"

vi.mock("@/lib/server/redis", () => ({
  getRedis: vi.fn(),
}))

const mockGetRedis = vi.mocked(getRedis)

// Import after mock is set up
const { checkRateLimit } = await import("@/lib/server/rate-limiter")

describe("checkRateLimit (user-based sliding window)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("allows first request when Redis returns count=1", async () => {
    mockGetRedis.mockReturnValue({
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(3600),
    } as never)

    const result = await checkRateLimit("user-abc", "Pro")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it("blocks request when count exceeds Pro limit (50/hr)", async () => {
    mockGetRedis.mockReturnValue({
      incr: vi.fn().mockResolvedValue(51),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(1800),
    } as never)

    const result = await checkRateLimit("user-abc", "Pro")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("blocks request when count exceeds Free limit (5/hr)", async () => {
    mockGetRedis.mockReturnValue({
      incr: vi.fn().mockResolvedValue(6),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(3000),
    } as never)

    const result = await checkRateLimit("user-xyz", "Free")
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("falls back to in-memory limiter when Redis is unavailable", async () => {
    mockGetRedis.mockReturnValue(null)

    const result = await checkRateLimit("user-no-redis", "Solo")
    expect(result.allowed).toBe(true)
    expect(typeof result.remaining).toBe("number")
  })

  it("Agency plan has a very high limit (9999/hr)", async () => {
    mockGetRedis.mockReturnValue({
      incr: vi.fn().mockResolvedValue(100),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(3600),
    } as never)

    const result = await checkRateLimit("agency-user", "Agency")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(9000)
  })
})
