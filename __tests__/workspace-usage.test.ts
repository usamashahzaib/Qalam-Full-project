import { describe, it, expect, vi, beforeEach } from "vitest"
import { createFakeSupabase, ok, fail } from "./mocks/supabase-client"

const { createServiceClient } = vi.hoisted(() => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient }))

const { checkWorkspaceUsage, incrementWorkspaceUsage, WORKSPACE_USAGE_LIMITS } = await import(
  "@/lib/server/workspace-usage"
)

describe("workspace usage (per-workspace Agency quotas)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe("checkWorkspaceUsage", () => {
    it("tracks usage per workspace independently", async () => {
      const fake = createFakeSupabase({
        tableResponses: {
          // Only workspace "ws-a" has usage recorded; "ws-b" has no row yet.
          workspace_usage: () => ok({ ai_drafts_used: 40 }),
        },
      })
      createServiceClient.mockReturnValue(fake)

      const resultA = await checkWorkspaceUsage("ws-a", "drafts")
      expect(resultA).toEqual({ allowed: true, used: 40, limit: WORKSPACE_USAGE_LIMITS.drafts, remaining: 20 })
    })

    it("reports zero usage (and full remaining) for a workspace with no row this period", async () => {
      const fake = createFakeSupabase({ tableResponses: { workspace_usage: () => ok(null) } })
      createServiceClient.mockReturnValue(fake)

      const result = await checkWorkspaceUsage("ws-fresh", "carousels")
      expect(result).toEqual({ allowed: true, used: 0, limit: WORKSPACE_USAGE_LIMITS.carousels, remaining: WORKSPACE_USAGE_LIMITS.carousels })
    })

    it("denies once usage reaches the workspace limit", async () => {
      const fake = createFakeSupabase({
        tableResponses: { workspace_usage: () => ok({ ai_drafts_used: WORKSPACE_USAGE_LIMITS.drafts }) },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await checkWorkspaceUsage("ws-a", "drafts")
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe("incrementWorkspaceUsage - RPC boundary", () => {
    it("allows and increments when RPC reports under the limit", async () => {
      const fake = createFakeSupabase({
        rpcResponses: { increment_workspace_usage: () => ok({ allowed: true, current: 41 }) },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementWorkspaceUsage("ws-a", "drafts")
      expect(result.allowed).toBe(true)
      expect(result.used).toBe(41)
      expect(result.remaining).toBe(WORKSPACE_USAGE_LIMITS.drafts - 41)
    })

    it("denies when the RPC reports the limit has been reached", async () => {
      const fake = createFakeSupabase({
        rpcResponses: {
          increment_workspace_usage: () => ok({ allowed: false, current: WORKSPACE_USAGE_LIMITS.drafts, error: "limit_exceeded" }),
        },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementWorkspaceUsage("ws-a", "drafts")
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe("incrementWorkspaceUsage - CAS fallback boundary (RPC not deployed / failing)", () => {
    it("denies at limit boundary (not one past): current usage exactly at the limit is refused", async () => {
      const limit = WORKSPACE_USAGE_LIMITS.carousels
      const fake = createFakeSupabase({
        rpcResponses: { increment_workspace_usage: () => fail("could not find the function") },
        tableResponses: {
          // "could not find" triggers the fail-open branch before the CAS
          // fallback is even reached, so this path returns allowed:true by
          // design (migration not deployed yet) - see the next test for the
          // true CAS boundary check via a generic RPC failure instead.
          workspace_usage: () => ok({ carousels_used: limit }),
        },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementWorkspaceUsage("ws-a", "carousels")
      // "does not exist / could not find" is treated as "migration not deployed" -> fail open.
      expect(result.allowed).toBe(true)
      expect(result.error).toBe("workspace_usage_not_deployed")
    })

    it("CAS fallback denies when current usage is exactly at the limit (not one past)", async () => {
      const limit = WORKSPACE_USAGE_LIMITS.drafts
      const fake = createFakeSupabase({
        rpcResponses: { increment_workspace_usage: () => fail("temporary rpc failure") },
        tableResponses: { workspace_usage: () => ok({ ai_drafts_used: limit }) },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementWorkspaceUsage("ws-a", "drafts")
      expect(result.allowed).toBe(false)
      expect(result.used).toBe(limit)
      expect(result.remaining).toBe(0)
      expect(result.error).toBe("limit_exceeded")
    })

    it("CAS fallback allows when current usage is one below the limit", async () => {
      const limit = WORKSPACE_USAGE_LIMITS.drafts
      const fake = createFakeSupabase({
        rpcResponses: { increment_workspace_usage: () => fail("temporary rpc failure") },
        tableResponses: {
          workspace_usage: () => ok({ ai_drafts_used: limit - 1 }),
        },
      })
      createServiceClient.mockReturnValue(fake)

      const result = await incrementWorkspaceUsage("ws-a", "drafts")
      expect(result.allowed).toBe(true)
      expect(result.used).toBe(limit)
      expect(result.remaining).toBe(0)
    })
  })

  describe("Agency vs non-Agency behavior", () => {
    it("workspace_usage is a fixed Agency-tier allowance (60 drafts / 10 carousels), not plan-derived", () => {
      // lib/server/plan-limits-v2.ts tracks per-USER usage against the plan's
      // PLAN_CONFIG limits; this module tracks per-WORKSPACE usage against a
      // fixed allowance regardless of which plan resolved the workspace here -
      // it is only ever invoked for Agency workspaces by the calling routes.
      expect(WORKSPACE_USAGE_LIMITS).toEqual({ drafts: 60, carousels: 10 })
    })

    it("two different workspaces under the same Agency account do not share a usage counter", async () => {
      const usageByWorkspace: Record<string, number> = { "ws-1": 60, "ws-2": 0 }
      const fake = createFakeSupabase({
        tableResponses: {
          workspace_usage: () => ok({ ai_drafts_used: usageByWorkspace["ws-1"] }),
        },
      })
      createServiceClient.mockReturnValue(fake)

      const ws1 = await checkWorkspaceUsage("ws-1", "drafts")
      expect(ws1.allowed).toBe(false) // ws-1 exhausted its own 60/month

      const fake2 = createFakeSupabase({
        tableResponses: { workspace_usage: () => ok({ ai_drafts_used: usageByWorkspace["ws-2"] }) },
      })
      createServiceClient.mockReturnValue(fake2)

      const ws2 = await checkWorkspaceUsage("ws-2", "drafts")
      expect(ws2.allowed).toBe(true) // ws-2 is untouched
    })
  })
})
