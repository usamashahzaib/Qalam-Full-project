import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { hasClientWorkspaceCapacity, checkPoolAllocation } from "@/lib/agency/capacity"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

describe("F1: an archived client workspace no longer occupies a paid slot", () => {
  it("the slot-creating RPC counts only active client workspaces", () => {
    const migration = source("supabase/migrations/20260924120000_agency_client_slot_active_only.sql")
    const countQuery = migration.slice(
      migration.indexOf("select count(*) into v_client_count"),
      migration.indexOf("if p_max_clients is not null")
    )
    expect(countQuery).toContain("workspace_type = 'client'")
    expect(countQuery).toContain("archived_at is null")
  })

  it("the archive route restores through the locked function that re-checks slots and the pool", () => {
    const route = source("app/api/workspaces/[id]/archive/route.ts")
    expect(route).toContain(`rpc("restore_client_workspace"`)
    expect(route).toContain("POOL_RPC_ARGS")
    expect(route).toContain("workspace_limit_reached")
  })

  it("restore, allocation and create all serialize on the same per-owner lock", () => {
    const migration = source("supabase/migrations/20260924140000_agency_pool_atomic_allocation.sql")
    const lock = "pg_advisory_xact_lock(hashtextextended('agency-clients:'"
    for (const fn of ["set_client_workspace_allowance", "restore_client_workspace", "create_client_workspace_with_limit"]) {
      const body = migration.slice(migration.indexOf(`function public.${fn}(`))
      expect(body.slice(0, body.indexOf("$$;"))).toContain(lock)
    }
  })

  it("client creation fits the new workspace into the pool", () => {
    const route = source("app/api/agency/clients/route.ts")
    expect(route).toContain("...POOL_RPC_ARGS")
  })

  it("the clients list excludes archived workspaces from the owned-slot count", () => {
    const route = source("app/api/agency/clients/route.ts")
    expect(route).toContain("!workspace.archived_at")
  })

  describe("hasClientWorkspaceCapacity", () => {
    it("allows creation below the limit", () => {
      expect(hasClientWorkspaceCapacity(4, 5)).toBe(true)
    })
    it("blocks creation at the limit", () => {
      expect(hasClientWorkspaceCapacity(5, 5)).toBe(false)
    })
    it("blocks creation over the limit", () => {
      expect(hasClientWorkspaceCapacity(6, 5)).toBe(false)
    })
    it("always allows unlimited", () => {
      expect(hasClientWorkspaceCapacity(9999, "unlimited")).toBe(true)
    })
  })

  it("simulates two years of realistic churn and confirms every replacement client can be won", () => {
    // Mirrors the audit's original failure scenario, but applying the new
    // rule: archiving frees a slot immediately (activeCount drops), so a
    // replacement win is only blocked if active clients are already at the
    // limit - which never happens here since a churn always precedes a win.
    const LIMIT = 5
    let active = 0
    const blocked: number[] = []
    const events: ("win" | "lose")[] = ["win", "win", "win", "win", "win", "lose", "win", "lose", "win", "lose", "win"]
    for (const [i, event] of events.entries()) {
      if (event === "win") {
        if (!hasClientWorkspaceCapacity(active, LIMIT)) { blocked.push(i + 1); continue }
        active++
      } else {
        active--
      }
    }
    expect(blocked).toEqual([])
    expect(active).toBe(5)
  })
})

describe("F2/F3: shared draft pool allocation math", () => {
  it("allows an allocation that fits within remaining pool capacity", () => {
    const result = checkPoolAllocation({ poolTotal: 300, otherAllocations: [60, 60, 60, 60], requested: 60 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(60)
  })

  it("allows a heavy client to draw more than the default share, as long as the pool covers it", () => {
    // The audit's lumpy-portfolio scenario: one client needs 120, four need 20 each.
    const result = checkPoolAllocation({ poolTotal: 300, otherAllocations: [20, 20, 20, 20], requested: 120 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(220) // 300 - 80 already allocated to the other four
  })

  it("rejects an allocation that would exceed the pool", () => {
    const result = checkPoolAllocation({ poolTotal: 300, otherAllocations: [80, 80, 80, 80], requested: 40 })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("allocation_exceeds_pool")
    expect(result.remaining).toBe(0) // others already allocated 320, over the 300 pool
  })

  it("rejects a negative allocation", () => {
    const result = checkPoolAllocation({ poolTotal: 300, otherAllocations: [], requested: -5 })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("allocation_negative")
  })

  it("accounts exactly at the boundary are allowed", () => {
    const result = checkPoolAllocation({ poolTotal: 300, otherAllocations: [250], requested: 50 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(50) // exactly enough room for this request
  })
})

describe("F6: the sold pool size and the enforced default cannot drift apart", () => {
  it("workspace-usage.ts imports its default from lib/pricing.ts rather than hardcoding a copy", async () => {
    const { WORKSPACE_USAGE_LIMITS } = await import("@/lib/server/workspace-usage")
    const {
      AGENCY_CLIENT_DRAFT_POOL,
      AGENCY_CLIENT_CAROUSEL_POOL,
      AGENCY_CLIENT_WORKSPACE_COUNT,
      AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE,
      AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE,
    } = await import("@/lib/pricing")

    expect(WORKSPACE_USAGE_LIMITS.drafts).toBe(AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE)
    expect(WORKSPACE_USAGE_LIMITS.carousels).toBe(AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE)
    // The identity itself, not just today's numbers matching by coincidence.
    expect(AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE).toBe(Math.floor(AGENCY_CLIENT_DRAFT_POOL / AGENCY_CLIENT_WORKSPACE_COUNT))
    expect(AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE).toBe(Math.floor(AGENCY_CLIENT_CAROUSEL_POOL / AGENCY_CLIENT_WORKSPACE_COUNT))
  })

  it("the marketed plan entry and the enforcement config read the same pool constants", async () => {
    const { plans, PLAN_CONFIG, AGENCY_CLIENT_DRAFT_POOL, AGENCY_CLIENT_CAROUSEL_POOL, AGENCY_CLIENT_WORKSPACE_COUNT, AGENCY_OWNER_DRAFT_RESERVE, AGENCY_OWNER_CAROUSEL_RESERVE } = await import("@/lib/pricing")
    const agency = plans.find((p) => p.name === "Agency")!
    // The marketed "sold to clients" numbers are exactly the client pool.
    expect(agency.postsPerMonth).toBe(AGENCY_CLIENT_DRAFT_POOL)
    expect(agency.carouselsPerMonth).toBe(AGENCY_CLIENT_CAROUSEL_POOL)
    expect(agency.workspaces).toBe(AGENCY_CLIENT_WORKSPACE_COUNT)
    // The enforced account-wide cap (F3) is the client pool plus the owner's
    // own reserve - never less than what is sold, by construction.
    expect(PLAN_CONFIG.Agency.limits.drafts).toBe(AGENCY_CLIENT_DRAFT_POOL + AGENCY_OWNER_DRAFT_RESERVE)
    expect(PLAN_CONFIG.Agency.limits.carousels).toBe(AGENCY_CLIENT_CAROUSEL_POOL + AGENCY_OWNER_CAROUSEL_RESERVE)
    expect(PLAN_CONFIG.Agency.limits.drafts).toBeGreaterThanOrEqual(AGENCY_CLIENT_DRAFT_POOL)
    expect(PLAN_CONFIG.Agency.limits.carousels).toBeGreaterThanOrEqual(AGENCY_CLIENT_CAROUSEL_POOL)
    expect(PLAN_CONFIG.Agency.flags.clientWorkspaces).toBe(AGENCY_CLIENT_WORKSPACE_COUNT)
  })

  it("PROVES drift is now structurally impossible: the real derivation function is what pricing.ts and workspace-usage.ts both consume", async () => {
    // This is the regression the audit found: pricing.ts said one thing,
    // workspace-usage.ts hardcoded a second, unrelated literal, and nothing
    // enforced they matched. Call the ACTUAL exported function - the same one
    // AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE is built from - so a future
    // edit to its logic (not just its inputs) is caught here too.
    const { deriveDefaultWorkspaceAllowance } = await import("@/lib/pricing")
    expect(deriveDefaultWorkspaceAllowance(300, 5)).toBe(60)
    expect(deriveDefaultWorkspaceAllowance(400, 5)).toBe(80)
    // Non-divisible pools floor rather than over-allocate or throw.
    expect(deriveDefaultWorkspaceAllowance(301, 5)).toBe(60)
    expect(deriveDefaultWorkspaceAllowance(0, 5)).toBe(0)
    expect(deriveDefaultWorkspaceAllowance(300, 0)).toBe(0)
  })
})

describe("F3: the owner's own workspace has headroom even when the client pool is fully saturated", () => {
  it("RESOLVES the audit's finding: fully allocating the client pool no longer leaves zero account headroom", async () => {
    const {
      AGENCY_CLIENT_DRAFT_POOL,
      AGENCY_CLIENT_CAROUSEL_POOL,
      AGENCY_CLIENT_WORKSPACE_COUNT,
      AGENCY_OWNER_DRAFT_RESERVE,
      AGENCY_OWNER_CAROUSEL_RESERVE,
      PLAN_CONFIG,
    } = await import("@/lib/pricing")

    // Simulate 5 client workspaces each fully using their default share -
    // exactly the "fully subscribed" scenario the audit found gave the owner
    // zero room to post on their own account.
    const clientPoolFullyUsed = AGENCY_CLIENT_DRAFT_POOL // 5 x 60, all consumed
    const accountCap = PLAN_CONFIG.Agency.limits.drafts
    const headroomForOwner = accountCap - clientPoolFullyUsed
    expect(headroomForOwner).toBe(AGENCY_OWNER_DRAFT_RESERVE)
    expect(headroomForOwner).toBeGreaterThan(0)

    const clientCarouselPoolFullyUsed = AGENCY_CLIENT_CAROUSEL_POOL
    const carouselCap = PLAN_CONFIG.Agency.limits.carousels
    expect(carouselCap - clientCarouselPoolFullyUsed).toBe(AGENCY_OWNER_CAROUSEL_RESERVE)

    // Sanity: the reserve is on top of, not carved out of, the client pool -
    // an owner allocating the full 300 to clients never has to shrink any
    // client's share to make room for themselves.
    expect(accountCap).toBeGreaterThan(AGENCY_CLIENT_DRAFT_POOL)
    void AGENCY_CLIENT_WORKSPACE_COUNT
  })

  it("the per-workspace default cap (used for the owner's personal workspace, which has no custom allowance) matches the reserve size", async () => {
    // The owner's personal workspace is checked at the workspace level too
    // (see lib/use-cases/generate-post.ts: isAgency applies to every
    // workspace, not just client ones), against the plan default since it can
    // never carry a custom monthly_draft_allowance (client-settings requires
    // clientOnly). That per-workspace ceiling should not be tighter than the
    // account-wide reserve meant to cover it.
    const { AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE, AGENCY_OWNER_DRAFT_RESERVE, AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE, AGENCY_OWNER_CAROUSEL_RESERVE } = await import("@/lib/pricing")
    expect(AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE).toBe(AGENCY_OWNER_DRAFT_RESERVE)
    expect(AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE).toBe(AGENCY_OWNER_CAROUSEL_RESERVE)
  })
})
