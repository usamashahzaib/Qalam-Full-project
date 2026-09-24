import { describe, it, expect, vi, beforeEach } from "vitest"

const { supabaseSelect, rpc } = vi.hoisted(() => ({ supabaseSelect: vi.fn(), rpc: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ supabaseSelect, createServiceClient: () => ({ rpc }) }))

const { siblingAllocations, setAllocation, poolStatus, POOL_RPC_ARGS } = await import("@/lib/server/agency/pool")
const {
  AGENCY_CLIENT_DRAFT_POOL,
  AGENCY_CLIENT_CAROUSEL_POOL,
  AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE,
  AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE,
} = await import("@/lib/pricing")

describe("agency pool allocation", () => {
  beforeEach(() => vi.resetAllMocks())

  it("siblingAllocations returns each other active client workspace's effective draft allowance", async () => {
    supabaseSelect.mockResolvedValueOnce([
      { id: "b", monthly_draft_allowance: 90, monthly_carousel_allowance: null },
      { id: "c", monthly_draft_allowance: null, monthly_carousel_allowance: 15 }, // no custom draft allowance -> default
      { id: "d", monthly_draft_allowance: 20, monthly_carousel_allowance: null },
    ])
    const result = await siblingAllocations("owner-1", "a", "drafts")
    expect(result).toEqual([90, AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE, 20])
    // Excludes the workspace being edited and archived siblings via the query itself.
    expect(supabaseSelect).toHaveBeenCalledWith("workspaces", expect.stringContaining("archived_at=is.null"))
    expect(supabaseSelect).toHaveBeenCalledWith("workspaces", expect.stringContaining("id=neq.a"))
  })

  it("siblingAllocations fails closed: an unreadable sibling list is an error, not an empty pool", async () => {
    supabaseSelect.mockRejectedValueOnce(new Error("network error"))
    await expect(siblingAllocations("owner-1", "a", "drafts")).rejects.toThrow("network error")
  })

  it("passes the pool sizes from lib/pricing.ts to every database function", () => {
    expect(POOL_RPC_ARGS).toEqual({
      p_draft_pool: AGENCY_CLIENT_DRAFT_POOL,
      p_carousel_pool: AGENCY_CLIENT_CAROUSEL_POOL,
      p_draft_default: AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE,
      p_carousel_default: AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE,
    })
  })

  it("setAllocation sends only the features being changed, with null meaning reset to default", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null })
    await expect(setAllocation("ws-1", { drafts: null })).resolves.toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledWith("set_client_workspace_allowance", {
      p_workspace_id: "ws-1",
      p_set_draft: true,
      p_draft: null,
      p_set_carousel: false,
      p_carousel: null,
      ...POOL_RPC_ARGS,
    })
  })

  it("setAllocation returns the database's refusal unchanged", async () => {
    const refusal = { ok: false, error: "allocation_exceeds_pool", feature: "drafts", poolTotal: 300, allocatedToOthers: 280, requested: 40, remaining: 20 }
    rpc.mockResolvedValueOnce({ data: refusal, error: null })
    await expect(setAllocation("ws-1", { drafts: 40 })).resolves.toEqual(refusal)
  })

  it("setAllocation surfaces a database error instead of treating it as success", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "workspace_not_found" } })
    await expect(setAllocation("ws-1", { carousels: 5 })).rejects.toThrow("workspace_not_found")
  })

  it("poolStatus reports mine, everyone else's, and what's left unallocated", async () => {
    supabaseSelect.mockResolvedValueOnce([
      { id: "b", monthly_draft_allowance: 60, monthly_carousel_allowance: null },
      { id: "c", monthly_draft_allowance: 60, monthly_carousel_allowance: null },
    ])
    const status = await poolStatus("owner-1", "a", "drafts", 90)
    expect(status).toEqual({
      poolTotal: AGENCY_CLIENT_DRAFT_POOL,
      allocatedToOthers: 120,
      mine: 90,
      defaultAllowance: AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE,
      unallocated: AGENCY_CLIENT_DRAFT_POOL - 120 - 90,
    })
  })

  it("poolStatus uses the plan default for 'mine' when this workspace has no custom allowance", async () => {
    supabaseSelect.mockResolvedValueOnce([])
    const status = await poolStatus("owner-1", "a", "drafts", null)
    expect(status.mine).toBe(AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE)
  })
})
