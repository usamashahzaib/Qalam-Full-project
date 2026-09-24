import "server-only"

// Lets an agency owner reallocate their shared draft/carousel pool across
// client workspaces. Every write goes through a database function that checks
// and writes under the owner's advisory lock (see
// supabase/migrations/20260924140000_agency_pool_atomic_allocation.sql), so
// concurrent edits, creates and restores can never oversubscribe the pool.
// The pool sizes themselves come from lib/pricing.ts and are passed in here.

import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"
import {
  AGENCY_CLIENT_DRAFT_POOL,
  AGENCY_CLIENT_CAROUSEL_POOL,
  AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE,
  AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE,
} from "@/lib/pricing"

export type PoolFeature = "drafts" | "carousels"

const POOL_TOTAL: Record<PoolFeature, number> = { drafts: AGENCY_CLIENT_DRAFT_POOL, carousels: AGENCY_CLIENT_CAROUSEL_POOL }
const DEFAULT_ALLOWANCE: Record<PoolFeature, number> = { drafts: AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE, carousels: AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE }
const ALLOWANCE_COLUMN = {
  drafts: "monthly_draft_allowance",
  carousels: "monthly_carousel_allowance",
} as const

/** Pool sizes and default shares, in the parameter names the database functions take. */
export const POOL_RPC_ARGS = {
  p_draft_pool: AGENCY_CLIENT_DRAFT_POOL,
  p_carousel_pool: AGENCY_CLIENT_CAROUSEL_POOL,
  p_draft_default: AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE,
  p_carousel_default: AGENCY_DEFAULT_WORKSPACE_CAROUSEL_ALLOWANCE,
} as const

type SiblingRow = { id: string; monthly_draft_allowance: number | null; monthly_carousel_allowance: number | null }

const effectiveAllowance = (value: number | null | undefined, feature: PoolFeature): number =>
  typeof value === "number" && value >= 0 ? value : DEFAULT_ALLOWANCE[feature]

/**
 * Every OTHER active client workspace this owner has, as its effective
 * (custom or plan-default) allowance for the given feature. Throws when the
 * lookup fails: an unreadable sibling list is not an empty one.
 */
export async function siblingAllocations(ownerId: string, excludeWorkspaceId: string, feature: PoolFeature): Promise<number[]> {
  const rows = await supabaseSelect<SiblingRow>(
    "workspaces",
    `owner_id=eq.${encodeURIComponent(ownerId)}&workspace_type=eq.client&archived_at=is.null&id=neq.${encodeURIComponent(excludeWorkspaceId)}&select=id,monthly_draft_allowance,monthly_carousel_allowance`
  )
  return (rows || []).map((row) => effectiveAllowance(row[ALLOWANCE_COLUMN[feature]], feature))
}

export type AllocationResult =
  | { ok: true }
  | {
      ok: false
      error: "allocation_exceeds_pool" | "allocation_negative"
      feature: PoolFeature
      poolTotal?: number
      allocatedToOthers?: number
      requested?: number
      remaining?: number
    }

/**
 * Sets one or both allowances atomically. `null` resets a feature to the
 * default share (and is validated like any other value); `undefined` leaves
 * it untouched. Nothing is written unless every requested change fits.
 */
export async function setAllocation(
  workspaceId: string,
  change: { drafts?: number | null; carousels?: number | null }
): Promise<AllocationResult> {
  const { data, error } = await createServiceClient().rpc("set_client_workspace_allowance", {
    p_workspace_id: workspaceId,
    p_set_draft: change.drafts !== undefined,
    p_draft: change.drafts ?? null,
    p_set_carousel: change.carousels !== undefined,
    p_carousel: change.carousels ?? null,
    ...POOL_RPC_ARGS,
  })
  if (error) throw new Error(error.message || "allocation_update_failed")
  return data as AllocationResult
}

export type PoolStatus = {
  poolTotal: number
  allocatedToOthers: number
  mine: number
  defaultAllowance: number
  unallocated: number
}

/** The full picture for one workspace's allocation UI: its share, everyone else's, and what's left to give out. */
export async function poolStatus(
  ownerId: string,
  workspaceId: string,
  feature: PoolFeature,
  currentAllowance: number | null
): Promise<PoolStatus> {
  const otherAllocations = await siblingAllocations(ownerId, workspaceId, feature)
  const allocatedToOthers = otherAllocations.reduce((sum, value) => sum + value, 0)
  const mine = effectiveAllowance(currentAllowance, feature)
  return {
    poolTotal: POOL_TOTAL[feature],
    allocatedToOthers,
    mine,
    defaultAllowance: DEFAULT_ALLOWANCE[feature],
    unallocated: Math.max(0, POOL_TOTAL[feature] - allocatedToOthers - mine),
  }
}
