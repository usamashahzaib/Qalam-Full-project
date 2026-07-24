import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const workspaceMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  resolveEffectivePlan: vi.fn(),
  getWorkspaceSessionContext: vi.fn(),
}))
vi.mock("@/lib/server/workspace", () => workspaceMocks)

const { getPlanStatus } = vi.hoisted(() => ({ getPlanStatus: vi.fn() }))
vi.mock("@/lib/server/plan-limits-v2", () => ({ getPlanStatus }))

const { supabaseCount } = vi.hoisted(() => ({ supabaseCount: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ supabaseCount }))

const { requirePlan, getMonthlyCount } = await import("@/lib/server/require-plan")

const activeSession = {
  userId: "user-1",
  email: "user@example.com",
  fullName: "User",
  firstName: "User",
  imageUrl: null,
  role: "user" as const,
  supabaseUserId: "supa-user-1",
}

const activePlanStatus = { isActive: true, expiresAt: null, renewalDue: false, daysUntilExpiry: null }

const fakeRequest = () => ({ nextUrl: new URL("https://byqalam.com/api/x"), method: "GET", clone: () => fakeRequest() }) as never

describe("requirePlan (plan gate on paid routes)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    workspaceMocks.requireAuth.mockResolvedValue("user-1")
    workspaceMocks.getWorkspaceSessionContext.mockResolvedValue(activeSession)
    workspaceMocks.resolveWorkspaceId.mockResolvedValue("ws-1")
    getPlanStatus.mockResolvedValue(activePlanStatus)
  })

  it("passes when the workspace's plan meets the required tier", async () => {
    workspaceMocks.resolveEffectivePlan.mockResolvedValue({ plan: "Pro", status: "active", overrideActive: false, planExpired: false })

    const result = await requirePlan(fakeRequest(), "Solo")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.plan).toBe("Pro")
      expect(result.workspaceId).toBe("ws-1")
    }
  })

  it("blocks a lower plan with a 403 and an upgrade_required payload", async () => {
    workspaceMocks.resolveEffectivePlan.mockResolvedValue({ plan: "Free", status: "active", overrideActive: false, planExpired: false })

    const result = await requirePlan(fakeRequest(), "Pro")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
      const body = await result.response.json()
      expect(body.error).toBe("upgrade_required")
      expect(body.requiredPlan).toBe("Pro")
      expect(body.currentPlan).toBe("Free")
    }
  })

  it("a missing/unresolved plan defaults to Free: passes Free-gated routes, blocks paid ones", async () => {
    // Mirrors what resolveEffectivePlan actually returns when no paid plan is
    // on file for the workspace (see fetchBaseWorkspacePlan in workspace.ts).
    workspaceMocks.resolveEffectivePlan.mockResolvedValue({ plan: "Free", status: "active", overrideActive: false, planExpired: false })

    const freeGated = await requirePlan(fakeRequest(), "Free")
    expect(freeGated.ok).toBe(true)

    const paidGated = await requirePlan(fakeRequest(), "Solo")
    expect(paidGated.ok).toBe(false)
    if (!paidGated.ok) expect(paidGated.response.status).toBe(403)
  })

  it("blocks an expired plan with 403 even if the required tier is Free", async () => {
    getPlanStatus.mockResolvedValue({ ...activePlanStatus, isActive: false })
    workspaceMocks.resolveEffectivePlan.mockResolvedValue({ plan: "Free", status: "canceled", overrideActive: false, planExpired: true })

    const result = await requirePlan(fakeRequest(), "Free")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
      const body = await result.response.json()
      expect(body.error).toBe("plan_expired")
    }
  })

  it("an active admin override reactivates an otherwise-expired plan", async () => {
    getPlanStatus.mockResolvedValue({ ...activePlanStatus, isActive: false })
    workspaceMocks.resolveEffectivePlan.mockResolvedValue({ plan: "Pro", status: "active", overrideActive: true, planExpired: false })

    const result = await requirePlan(fakeRequest(), "Pro")
    expect(result.ok).toBe(true)
  })

  it("returns 401 when there is no authenticated session", async () => {
    workspaceMocks.requireAuth.mockRejectedValue(new Error("auth_required"))

    const result = await requirePlan(fakeRequest(), "Free")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})

describe("getMonthlyCount (month boundary must be UTC, not host-local)", () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    vi.resetAllMocks()
    supabaseCount.mockResolvedValue(0)
  })

  afterEach(() => {
    process.env.TZ = originalTz
    vi.useRealTimers()
  })

  it("anchors to UTC midnight on the 1st regardless of the host's local timezone", async () => {
    // A host running in UTC-5 (e.g. America/New_York) is still late evening on
    // Jan 31 in local time when it is already Feb 1 00:30 UTC. A local-time
    // "start of month" (setDate/setHours) would compute Jan 1 local instead of
    // Feb 1 UTC - a full month off - if the fix regressed.
    process.env.TZ = "America/New_York"
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-01T00:30:00.000Z"))

    await getMonthlyCount("posts", "ws-1")

    expect(supabaseCount).toHaveBeenCalledTimes(1)
    const [, query] = supabaseCount.mock.calls[0]
    expect(query).toContain("created_at=gte.2026-02-01T00:00:00.000Z")
  })

  it("returns the count via a HEAD/count=exact query rather than fetching rows", async () => {
    supabaseCount.mockResolvedValue(42)
    const count = await getMonthlyCount("carousels", "ws-1")
    expect(count).toBe(42)
  })

  it("rejects a table not on the allowed list", async () => {
    await expect(getMonthlyCount("users", "ws-1")).rejects.toThrow(/not in the allowed list/)
  })
})
