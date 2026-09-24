// Pure client-workspace capacity math, shared by the create RPC's mirror
// checks and the archive route's restore guard. Kept separate from the SQL
// so the decision itself - not just its SQL encoding - has a test that runs
// without a database.

/** Whether the owner has room for one more active client workspace. */
export function hasClientWorkspaceCapacity(activeCount: number, limit: number | "unlimited"): boolean {
  if (limit === "unlimited") return true
  return activeCount < limit
}

export type PoolAllocationCheck = {
  ok: boolean
  error?: "allocation_exceeds_pool" | "allocation_negative"
  poolTotal: number
  allocatedToOthers: number
  requested: number
  remaining: number
}

/**
 * Validates a proposed per-workspace allowance against the account's shared
 * pool (see lib/server/workspace-usage.ts). `otherAllocations` is every other
 * client workspace's currently configured allowance (custom or default) for
 * the same owner - the requested value must fit in what they haven't already
 * committed elsewhere.
 */
export function checkPoolAllocation(input: {
  poolTotal: number
  otherAllocations: number[]
  requested: number
}): PoolAllocationCheck {
  const allocatedToOthers = input.otherAllocations.reduce((sum, value) => sum + value, 0)
  const remaining = Math.max(0, input.poolTotal - allocatedToOthers)
  if (input.requested < 0) {
    return { ok: false, error: "allocation_negative", poolTotal: input.poolTotal, allocatedToOthers, requested: input.requested, remaining }
  }
  if (allocatedToOthers + input.requested > input.poolTotal) {
    return { ok: false, error: "allocation_exceeds_pool", poolTotal: input.poolTotal, allocatedToOthers, requested: input.requested, remaining }
  }
  return { ok: true, poolTotal: input.poolTotal, allocatedToOthers, requested: input.requested, remaining }
}
