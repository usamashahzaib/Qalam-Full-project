import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/env", () => ({
  env: { lemonSqueezyApiKey: "test-api-key" },
}))

import { createReferralDiscountCode } from "@/lib/server/lemonsqueezy-api"

describe("Lemon Squeezy referral discounts", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("creates a one-use, short-lived discount for every paid variant", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        data: { attributes: { code: "QREFSERVERCODE" } },
      }), { status: 201 })
    )

    await expect(createReferralDiscountCode(20)).resolves.toBe("QREFSERVERCODE")

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init?.body))
    expect(body.data.attributes).toEqual(expect.objectContaining({
      amount: 20,
      amount_type: "percent",
      duration: "once",
      is_limited_redemptions: true,
      max_redemptions: 1,
    }))
    expect(body.data.relationships.variants.data).toHaveLength(4)
    expect(new Date(body.data.attributes.expires_at).getTime()).toBeGreaterThan(Date.now())
  })

  it("rejects an invalid discount before calling the provider", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    await expect(createReferralDiscountCode(0)).rejects.toThrow("invalid_referral_discount")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
