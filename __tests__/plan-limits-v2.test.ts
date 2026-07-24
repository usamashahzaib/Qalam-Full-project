import { describe, it, expect, vi, beforeEach } from "vitest"
import { createFakeSupabase, ok, fail } from "./mocks/supabase-client"

const { createServiceClient } = vi.hoisted(() => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({
  createServiceClient,
  sanitizeOrFilterValue: (value: string) => value.replace(/[(),]/g, ""),
}))

// plan-limits-v2.ts re-exports requirePlan from require-plan.ts, which imports
// lib/server/workspace.ts -> the full @/auth NextAuth config. That chain doesn't
// resolve cleanly under Vitest, and none of these tests exercise requirePlan.
vi.mock("@/lib/server/workspace", () => ({
  requireAuth: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  resolveEffectivePlan: vi.fn(),
  getWorkspaceSessionContext: vi.fn(),
}))

const { getPlanStatus, checkPlanLimit, incrementUsage } = await import("@/lib/server/plan-limits-v2")

// A "no user found" users row makes both plan-expiry.ts's getPlanStatus and
// plan-limits-v2.ts's own users query resolve to a Free, active, non-expiring
// plan - the simplest baseline to build each scenario's overrides on top of.
const baseTables = (overrides: Record<string, () => { data: unknown; error: null }> = {}) => ({
  users: () => ok(null),
  payments: () => ok(null),
  user_overrides: () => ok([]),
  ...overrides,
})

describe("plan-limits-v2 (quota enforcement)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe("getPlanStatus - billing-cycle quota reset", () => {
    it("resets usage counters to zero once a new 30-day annual-billing window starts", async () => {
      const now = new Date("2026-07-23T00:00:00.000Z")
      vi.useFakeTimers()
      vi.setSystemTime(now)
      try {
        const planStartedAt = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString() // 65 days ago -> 2 windows elapsed
        const staleCycleStart = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString() // stale: before the current window

        const fake = createFakeSupabase({
          rpcResponses: {
            get_or_create_plan_usage: () =>
              ok({ ai_drafts_used: 55, carousels_used: 9, hooks_used: 10, analyses_used: 4, cycle_start: staleCycleStart, cycle_end: null }),
          },
          tableResponses: baseTables({
            users: () =>
              ok({
                id: "user-1",
                external_user_id: "user-1",
                plan: "Pro",
                plan_expires_at: null,
                plan_started_at: planStartedAt,
                billing_cycle: "annual",
                created_at: planStartedAt,
              }),
          }),
        })
        createServiceClient.mockReturnValue(fake)

        const status = await getPlanStatus("user-1")

        // Reset zeroed every usage field, even though the RPC returned non-zero counts.
        expect(status.drafts.used).toBe(0)
        expect(status.carousels.used).toBe(0)
        expect(status.hooks.used).toBe(0)
        expect(status.analyses.used).toBe(0)
        expect(status.plan).toBe("Pro")
      } finally {
        vi.useRealTimers()
      }
    })

    it("does not reset usage when the cycle_start is already inside the current window", async () => {
      const now = new Date("2026-07-23T00:00:00.000Z")
      vi.useFakeTimers()
      vi.setSystemTime(now)
      try {
        const planStartedAt = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString()
        const freshCycleStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago -> inside the current window

        const fake = createFakeSupabase({
          rpcResponses: {
            get_or_create_plan_usage: () =>
              ok({ ai_drafts_used: 12, carousels_used: 2, hooks_used: 1, analyses_used: 0, cycle_start: freshCycleStart, cycle_end: null }),
          },
          tableResponses: baseTables({
            users: () =>
              ok({
                id: "user-1",
                external_user_id: "user-1",
                plan: "Pro",
                plan_expires_at: null,
                plan_started_at: planStartedAt,
                billing_cycle: "annual",
                created_at: planStartedAt,
              }),
          }),
        })
        createServiceClient.mockReturnValue(fake)

        const status = await getPlanStatus("user-1")
        expect(status.drafts.used).toBe(12)
        expect(status.carousels.used).toBe(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it("does not apply the annual reset window to monthly-billed users", async () => {
      const fake = createFakeSupabase({
        rpcResponses: {
          get_or_create_plan_usage: () =>
            ok({ ai_drafts_used: 40, carousels_used: 5, hooks_used: 5, analyses_used: 5, cycle_start: null, cycle_end: null }),
        },
        tableResponses: baseTables({
          users: () =>
            ok({ id: "user-1", external_user_id: "user-1", plan: "Pro", plan_expires_at: null, plan_started_at: null, billing_cycle: "monthly" }),
        }),
      })
      createServiceClient.mockReturnValue(fake)

      const status = await getPlanStatus("user-1")
      expect(status.drafts.used).toBe(40)
    })
  })

  describe("checkPlanLimit", () => {
    it("reports remaining quota for a Free-plan user with a fresh usage row", async () => {
      const fake = createFakeSupabase({
        rpcResponses: { get_or_create_plan_usage: () => ok({ ai_drafts_used: 2, carousels_used: 0, hooks_used: 0, analyses_used: 0 }) },
        tableResponses: baseTables(),
      })
      createServiceClient.mockReturnValue(fake)

      const result = await checkPlanLimit("user-free", "drafts")
      expect(result).toEqual({ allowed: true, current: 2, limit: 5, remaining: 3, plan: "Free" })
    })

    it("denies once usage matches the plan's limit exactly", async () => {
      const fake = createFakeSupabase({
        rpcResponses: { get_or_create_plan_usage: () => ok({ ai_drafts_used: 5, carousels_used: 0, hooks_used: 0, analyses_used: 0 }) },
        tableResponses: baseTables(),
      })
      createServiceClient.mockReturnValue(fake)

      const result = await checkPlanLimit("user-free", "drafts")
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it("enforces the Solo carousel limit at three per month", async () => {
      const fake = createFakeSupabase({
        rpcResponses: {
          get_or_create_plan_usage: () =>
            ok({ ai_drafts_used: 0, carousels_used: 2, hooks_used: 0, analyses_used: 0 }),
        },
        tableResponses: baseTables({
          users: () =>
            ok({
              id: "solo-carousel-user",
              external_user_id: "solo-carousel-user",
              plan: "Solo",
              plan_expires_at: null,
              plan_started_at: null,
              billing_cycle: "monthly",
            }),
        }),
      })
      createServiceClient.mockReturnValue(fake)

      const result = await checkPlanLimit("solo-carousel-user", "carousels")
      expect(result).toEqual({ allowed: true, current: 2, limit: 3, remaining: 1, plan: "Solo" })
    })
  })

  describe("incrementUsage - CAS fallback boundary (RPC unavailable)", () => {
    // incrementUsage() normally delegates the allow/deny decision to the
    // increment_plan_usage Postgres RPC. When that RPC is unavailable it falls
    // back to an in-process compare-and-swap - this is the only place the
    // "deny at limit boundary, not one past" rule is enforced in application
    // code, so that's what these tests target.
    it("allows the increment when current usage is exactly one below the limit", async () => {
      const fake = createFakeSupabase({
        rpcResponses: {
          get_or_create_plan_usage: () => ok({ ai_drafts_used: 4, carousels_used: 0, hooks_used: 0, analyses_used: 0 }),
          increment_plan_usage: () => fail("temporary rpc failure"),
        },
        tableResponses: {
          ...baseTables(),
          plan_usage: () => ok({ ai_drafts_used: 4 }), // Free limit is 5 -> one below
        },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementUsage("user-free", "drafts")
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(5)
      expect(result.remaining).toBe(0)
    })

    it("denies the increment when current usage already equals the limit (not one past)", async () => {
      const fake = createFakeSupabase({
        rpcResponses: {
          get_or_create_plan_usage: () => ok({ ai_drafts_used: 5, carousels_used: 0, hooks_used: 0, analyses_used: 0 }),
          increment_plan_usage: () => fail("temporary rpc failure"),
        },
        tableResponses: {
          ...baseTables(),
          plan_usage: () => ok({ ai_drafts_used: 5 }), // Free limit is 5 -> at the boundary
        },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementUsage("user-free", "drafts")
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(5)
      expect(result.remaining).toBe(0)
      expect(result.error).toBe("limit_exceeded")
    })
  })
})
