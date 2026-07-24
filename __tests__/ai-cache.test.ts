import { beforeEach, describe, expect, it, vi } from "vitest"
import { getRedis } from "@/lib/server/redis"

vi.mock("@/lib/server/redis", () => ({ getRedis: vi.fn() }))

const mockGetRedis = vi.mocked(getRedis)
const { getCachedAiResponse } = await import("@/lib/server/queue")

describe("AI cache", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns cached strings unchanged", async () => {
    mockGetRedis.mockReturnValue({ get: vi.fn().mockResolvedValue("plain text") } as never)
    await expect(getCachedAiResponse("hash")).resolves.toBe("plain text")
  })

  it("serializes Upstash auto-decoded JSON", async () => {
    mockGetRedis.mockReturnValue({
      get: vi.fn().mockResolvedValue({ score: 91, notes: ["clear"] }),
    } as never)

    await expect(getCachedAiResponse("hash")).resolves.toBe('{"score":91,"notes":["clear"]}')
  })
})
