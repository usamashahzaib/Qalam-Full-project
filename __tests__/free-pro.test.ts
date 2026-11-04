import { afterEach, describe, expect, it, vi } from "vitest"
import { createFakeSupabase, ok } from "./mocks/supabase-client"
import { freeProEndLabel, isFreeProActive, withFreePro } from "@/lib/free-pro"

const { createServiceClient } = vi.hoisted(() => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({
  createServiceClient,
  sanitizeOrFilterValue: (value: string) => value,
  supabaseSelect: vi.fn(),
}))
vi.mock("@/lib/server/workspace", () => ({
  requireAuth: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  resolveEffectivePlan: vi.fn(),
  getWorkspaceSessionContext: vi.fn(),
}))

const { getPlanStatus } = await import("@/lib/server/plan-limits-v2")
const { applyUserOverrides } = await import("@/lib/server/overrides")

const BEFORE = Date.parse("2027-02-03T23:59:00Z")
const AFTER = Date.parse("2027-02-04T00:00:00Z")

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("free Pro offer", () => {
  it("is off when the date is missing or invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "")
    expect(isFreeProActive(BEFORE)).toBe(false)
    expect(withFreePro("Free", BEFORE)).toBe("Free")
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "soon")
    expect(isFreeProActive(BEFORE)).toBe(false)
    expect(freeProEndLabel(BEFORE)).toBeNull()
  })

  it("raises Free and Solo to Pro and leaves Pro and Agency alone", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "2027-02-04")
    expect(withFreePro("Free", BEFORE)).toBe("Pro")
    expect(withFreePro("free", BEFORE)).toBe("Pro")
    expect(withFreePro("Solo", BEFORE)).toBe("Pro")
    expect(withFreePro("Pro", BEFORE)).toBe("Pro")
    expect(withFreePro("Agency", BEFORE)).toBe("Agency")
  })

  it("stops when the date arrives", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "2027-02-04")
    expect(freeProEndLabel(BEFORE)).toBe("4 February 2027")
    expect(withFreePro("Free", AFTER)).toBe("Free")
    expect(freeProEndLabel(AFTER)).toBeNull()
  })

  const statusAt = async (time: number, user: Record<string, unknown>) => {
    vi.useFakeTimers()
    vi.setSystemTime(time)
    createServiceClient.mockReturnValue(createFakeSupabase({
      rpcResponses: { get_or_create_plan_usage: () => ok({ ai_drafts_used: 5, carousels_used: 0, hooks_used: 0, analyses_used: 0 }) },
      tableResponses: { users: () => ok(user), payments: () => ok(null), user_overrides: () => ok([]) },
    }))
    return getPlanStatus("user-1")
  }

  it("gives a Free account Pro limits in plan status, and takes them back after the date", async () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "2027-02-04")
    const free = { id: "user-1", external_user_id: "user-1", plan: "Free", plan_expires_at: null }
    const during = await statusAt(BEFORE, free)
    expect(during.plan).toBe("Pro")
    expect(during.drafts.limit).toBeGreaterThan(10)
    const after = await statusAt(AFTER, free)
    expect(after.plan).toBe("Free")
    expect(after.drafts.limit).toBeLessThan(during.drafts.limit)
  })

  it("keeps an expired paid account active during the offer", async () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "2027-02-04")
    const status = await statusAt(BEFORE, { id: "user-1", external_user_id: "user-1", plan: "Solo", plan_expires_at: "2027-01-01T00:00:00Z" })
    expect(status.plan).toBe("Pro")
    expect(status.isActive).toBe(true)
  })

  it("applies on the workspace plan path too, which is what the app's gates read", async () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_PRO_UNTIL", "2099-01-01")
    const info = await applyUserOverrides({ plan: "Free", status: "active", expiresAt: null })
    expect(info.plan).toBe("Pro")
    expect(info.limits.canExport).toBe(true)
  })
})
