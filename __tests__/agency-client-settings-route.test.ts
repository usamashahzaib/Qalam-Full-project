import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { requirePlan } = vi.hoisted(() => ({ requirePlan: vi.fn() }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan }))

const { requireWorkspaceAccess, agencyErrorResponse } = vi.hoisted(() => ({
  requireWorkspaceAccess: vi.fn(),
  // A minimal stand-in for the real implementation (which pulls in
  // next-auth via lib/server/workspace and cannot load in this test
  // environment) - none of these tests exercise the generic catch-all path,
  // so this only needs to be call-compatible.
  agencyErrorResponse: vi.fn((error: Error) => Response.json({ error: error.message }, { status: 500 })),
}))
vi.mock("@/lib/server/agency/access", () => ({ requireWorkspaceAccess, agencyErrorResponse }))

const { supabasePatch } = vi.hoisted(() => ({ supabasePatch: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ supabasePatch }))

const { setAllocation, poolStatus } = vi.hoisted(() => ({ setAllocation: vi.fn(), poolStatus: vi.fn() }))
vi.mock("@/lib/server/agency/pool", () => ({ setAllocation, poolStatus }))
vi.mock("@/lib/server/logging", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

const { PATCH } = await import("@/app/api/workspaces/[id]/client-settings/route")

const baseWorkspace = {
  id: "ws-1",
  name: "Acme",
  owner_id: "owner-1",
  workspace_type: "client" as const,
  archived_at: null,
  branding_color: null,
  client_contact_name: null,
  client_contact_email: "client@acme.test",
  cadence_posts_per_week: 3,
  auto_approve_hours: null,
  voice_drop_enabled: false,
  monthly_proof_enabled: false,
  voice_passport_summary: null,
  monthly_draft_allowance: null,
  monthly_carousel_allowance: null,
}

const makeRequest = (body: unknown) =>
  new NextRequest("https://example.test/api/workspaces/ws-1/client-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("PATCH /api/workspaces/[id]/client-settings - pool allocation (F2)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    requirePlan.mockResolvedValue({ ok: true })
    requireWorkspaceAccess.mockResolvedValue({ workspace: baseWorkspace })
    poolStatus.mockResolvedValue({ poolTotal: 300, allocatedToOthers: 0, mine: 60, defaultAllowance: 60, unallocated: 240 })
  })

  it("saves an allocation through the atomic pool function", async () => {
    setAllocation.mockResolvedValue({ ok: true })
    supabasePatch.mockResolvedValue([{ ...baseWorkspace, monthly_draft_allowance: 120 }])

    const res = await PATCH(makeRequest({ draftAllowance: 120 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.draftAllowance).toBe(120)
    expect(setAllocation).toHaveBeenCalledWith("ws-1", { drafts: 120, carousels: undefined })
    // The allowance itself is written by the locked database call, never by the plain patch.
    expect(supabasePatch).toHaveBeenCalledWith("workspaces", "id=eq.ws-1", expect.not.objectContaining({ monthly_draft_allowance: expect.anything() }))
  })

  it("rejects an allocation that would exceed the pool, without writing anything else", async () => {
    setAllocation.mockResolvedValue({ ok: false, error: "allocation_exceeds_pool", feature: "drafts", poolTotal: 300, allocatedToOthers: 280, requested: 40, remaining: 20 })

    const res = await PATCH(makeRequest({ draftAllowance: 40, cadencePostsPerWeek: 4 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("allocation_exceeds_pool")
    expect(body.feature).toBe("drafts")
    expect(body.remaining).toBe(20)
    expect(body.allocatedToOthers).toBe(280)
    expect(supabasePatch).not.toHaveBeenCalled()
  })

  it("sends draft and carousel changes together so they succeed or fail as one", async () => {
    setAllocation.mockResolvedValue({ ok: false, error: "allocation_exceeds_pool", feature: "carousels", poolTotal: 50, allocatedToOthers: 45, requested: 10, remaining: 5 })

    const res = await PATCH(makeRequest({ draftAllowance: 30, carouselAllowance: 10 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(400)
    expect((await res.json()).feature).toBe("carousels")
    expect(setAllocation).toHaveBeenCalledTimes(1)
    expect(setAllocation).toHaveBeenCalledWith("ws-1", { drafts: 30, carousels: 10 })
  })

  it("validates a reset to the plan default (null) instead of skipping the pool check", async () => {
    setAllocation.mockResolvedValue({ ok: false, error: "allocation_exceeds_pool", feature: "drafts", poolTotal: 300, allocatedToOthers: 300, requested: 60, remaining: 0 })

    const res = await PATCH(makeRequest({ draftAllowance: null }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(400)
    expect(setAllocation).toHaveBeenCalledWith("ws-1", { drafts: null, carousels: undefined })
    expect(supabasePatch).not.toHaveBeenCalled()
  })

  it("leaves the pool alone when no allowance is being changed", async () => {
    supabasePatch.mockResolvedValue([{ ...baseWorkspace, cadence_posts_per_week: 5 }])
    const res = await PATCH(makeRequest({ cadencePostsPerWeek: 5 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(200)
    expect(setAllocation).not.toHaveBeenCalled()
  })

  it("still returns settings when the display-only pool breakdown cannot be read", async () => {
    poolStatus.mockRejectedValue(new Error("network error"))
    supabasePatch.mockResolvedValue([{ ...baseWorkspace, cadence_posts_per_week: 5 }])
    const res = await PATCH(makeRequest({ cadencePostsPerWeek: 5 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.draftPool).toBeNull()
    expect(body.settings.carouselPool).toBeNull()
  })

  it("rejects a negative allowance before it ever reaches the pool (schema validation)", async () => {
    const res = await PATCH(makeRequest({ draftAllowance: -5 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid_input")
    expect(setAllocation).not.toHaveBeenCalled()
  })

  it("rejects any allocation change when the workspace has no owner on record", async () => {
    requireWorkspaceAccess.mockResolvedValue({ workspace: { ...baseWorkspace, owner_id: null } })
    const res = await PATCH(makeRequest({ draftAllowance: 100 }), { params: Promise.resolve({ id: "ws-1" }) })
    expect(res.status).toBe(409)
    expect(setAllocation).not.toHaveBeenCalled()
  })
})
