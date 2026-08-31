import { describe, it, expect, vi, beforeEach } from "vitest"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const { createServiceClient } = vi.hoisted(() => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient }))

const {
  markReferralPaid,
  creditReferralCommissionFromPayment,
  getPayoutBalance,
  getDiscountForUser,
  requestPayout,
  markPayoutPaid,
  MIN_PAYOUT_USD,
} = await import("@/lib/server/referrals")

describe("referral commission accrual", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("credits 10% commission on a referred user's first payment", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referral_uses: ok({ id: "use-1", status: "pending", commission_percent: 10 }),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await creditReferralCommissionFromPayment("user-2", "Solo", 1349)
    expect(result.credited).toBe(true)
  })

  it("does not double-credit a renewal payment for an already-paid referral", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referral_uses: ok({ id: "use-1", status: "paid", commission_percent: 10 }),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await creditReferralCommissionFromPayment("user-2", "Solo", 1349)
    expect(result.credited).toBe(false)
  })

  it("is a no-op for a user who was never referred", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referral_uses: ok(null),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await creditReferralCommissionFromPayment("user-3", "Solo", 1349)
    expect(result.credited).toBe(false)
  })

  it("admin mark-paid rejects a referral that was already marked paid", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referral_uses: ok({ id: "use-1", status: "paid", commission_percent: 10 }),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await markReferralPaid("user-2", "Solo", 1349)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/already/i)
  })

  it("offers the referral discount only before the first paid conversion", async () => {
    const pending = createFakeSupabase({
      tableResponses: {
        referral_uses: ok({ discount_applied: 20, status: "pending" }),
      },
    })
    createServiceClient.mockReturnValue(pending)
    await expect(getDiscountForUser("user-2")).resolves.toBe(20)

    const paid = createFakeSupabase({
      tableResponses: {
        referral_uses: ok({ discount_applied: 20, status: "paid" }),
      },
    })
    createServiceClient.mockReturnValue(paid)
    await expect(getDiscountForUser("user-2")).resolves.toBe(0)

    const refunded = createFakeSupabase({
      tableResponses: {
        referral_uses: ok({ discount_applied: 20, status: "refunded" }),
      },
    })
    createServiceClient.mockReturnValue(refunded)
    await expect(getDiscountForUser("user-2")).resolves.toBe(0)
  })
})

describe("referral payout balance", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("available balance subtracts pending and paid payouts from total commission", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referrals: ok([{ id: "r1" }]),
        referral_uses: ok([{ commission_amount: 150 }, { commission_amount: 50 }]),
        referral_payouts: ok([
          { amount: 100, status: "pending" },
          { amount: 50, status: "paid" },
        ]),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const balance = await getPayoutBalance("user-1", "user1@example.com")
    expect(balance.totalCommission).toBe(200)
    expect(balance.pendingPayout).toBe(100)
    expect(balance.paidOut).toBe(50)
    expect(balance.availableBalance).toBe(50)
  })

  it("clamps available balance at zero rather than going negative", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referrals: ok([{ id: "r1" }]),
        referral_uses: ok([{ commission_amount: 100 }]),
        referral_payouts: ok([{ amount: 100, status: "paid" }, { amount: 100, status: "pending" }]),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const balance = await getPayoutBalance("user-1", "user1@example.com")
    expect(balance.availableBalance).toBe(0)
  })
})

describe("requestPayout", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("rejects a payout below the minimum", async () => {
    const result = await requestPayout("user-1", "u@example.com", MIN_PAYOUT_USD - 1, "jazzcash", "0300-1234567")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/minimum/i)
  })

  it("rejects an invalid payment method", async () => {
    const result = await requestPayout("user-1", "u@example.com", MIN_PAYOUT_USD, "paypal", "0300-1234567")
    expect(result.success).toBe(false)
  })

  it("rejects missing account details", async () => {
    const result = await requestPayout("user-1", "u@example.com", MIN_PAYOUT_USD, "jazzcash", "  ")
    expect(result.success).toBe(false)
  })

  it("rejects a request that exceeds available balance", async () => {
    // Balance check + insert now happen atomically inside the
    // request_referral_payout RPC (migration 0063) - the DB function is what
    // enforces this, so the test only needs to assert requestPayout() surfaces
    // the RPC's insufficient_balance error correctly.
    const fake = createFakeSupabase({
      tableResponses: {
        referrals: ok([{ id: "r1" }]),
      },
      rpcResponses: {
        request_referral_payout: () => ({ data: null, error: { message: "insufficient_balance" } }),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await requestPayout("user-1", "u@example.com", 5000, "jazzcash", "0300-1234567")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/exceeds/i)
  })

  it("accepts a valid request within available balance", async () => {
    const fake = createFakeSupabase({
      tableResponses: {
        referrals: ok([{ id: "r1" }]),
      },
      rpcResponses: {
        request_referral_payout: ok("payout-1"),
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await requestPayout("user-1", "u@example.com", 2000, "jazzcash", "0300-1234567")
    expect(result.success).toBe(true)
    expect(result.payoutId).toBe("payout-1")
  })
})

describe("markPayoutPaid", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("blocks a payout whose commission was later refunded", async () => {
    const fake = createFakeSupabase({
      rpcResponses: {
        mark_referral_payout_paid: {
          data: null,
          error: { message: "insufficient_balance" },
        },
      },
    })
    createServiceClient.mockReturnValue(fake)

    const result = await markPayoutPaid("payout-1", "transfer-1")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/refundable commission balance/i)
  })
})
