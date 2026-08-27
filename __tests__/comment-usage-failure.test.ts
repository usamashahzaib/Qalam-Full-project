import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()

vi.mock("@/lib/server/supabase-rest", () => ({
  createServiceClient: () => ({ rpc }),
}))

vi.mock("@/lib/server/logging", () => ({
  log: { error: vi.fn() },
}))

import { reserveCommentUsage } from "@/lib/server/comment-usage"

describe("reserveCommentUsage", () => {
  beforeEach(() => rpc.mockReset())

  it("identifies an unavailable quota RPC instead of reporting a false plan limit", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } })

    await expect(reserveCommentUsage("user-1", 150)).resolves.toEqual({
      allowed: false,
      current: 0,
      limit: 150,
      unavailable: true,
    })
  })
})
