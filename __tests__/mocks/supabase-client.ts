// Minimal fake of the @supabase/supabase-js fluent query builder, for unit
// tests that need to stub createServiceClient() without touching a real
// database. Chain methods (select/eq/neq/gte/lte/or/in/order/limit/update/
// insert/upsert) all return the same thenable so any call order the source
// code uses resolves to the table's configured response. Not a full fake -
// only the methods lib/server/*.ts actually calls are implemented.
import { vi } from "vitest"

export type FakeResponse<T = unknown> = { data: T; error: { message: string } | null }

export const ok = <T>(data: T): FakeResponse<T> => ({ data, error: null })
export const fail = (message: string): FakeResponse<null> => ({ data: null, error: { message } })

function makeChain(response: FakeResponse<unknown>) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "neq", "gte", "lte", "or", "in", "ilike", "order", "limit", "update", "insert", "upsert", "delete", "range"]
  for (const m of methods) chain[m] = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(async () => response)
  chain.single = vi.fn(async () => response)
  // Supabase query builders are themselves thenable (awaiting them without
  // calling .maybeSingle()/.single() resolves the same way) - some call
  // sites in this codebase rely on that directly.
  chain.then = (resolve: (v: FakeResponse<unknown>) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(response).then(resolve, reject)
  return chain
}

/**
 * Builds a fake supabase client. `tableResponses` maps table name -> response
 * returned by every builder call against that table. `rpcResponses` maps rpc
 * name -> response. Both can be objects (static) or functions (dynamic per call).
 */
export function createFakeSupabase(opts: {
  tableResponses?: Record<string, FakeResponse<unknown> | (() => FakeResponse<unknown>)>
  rpcResponses?: Record<string, FakeResponse<unknown> | (() => FakeResponse<unknown>)>
} = {}) {
  const { tableResponses = {}, rpcResponses = {} } = opts

  const resolveConfig = (cfg: FakeResponse<unknown> | (() => FakeResponse<unknown>) | undefined) =>
    typeof cfg === "function" ? cfg() : cfg ?? ok(null)

  const from = vi.fn((table: string) => makeChain(resolveConfig(tableResponses[table])))
  const rpc = vi.fn(async (name: string) => resolveConfig(rpcResponses[name]))

  return { from, rpc }
}

/**
 * Fake for createScopedClient(workspaceId) - mirrors the real wrapper in
 * lib/server/supabase-rest.ts (select/insert/upsert auto-scope by
 * workspace_id, .raw escapes scoping). createScopedClient can't be exercised
 * by mocking createServiceClient alone: both are defined in the same module,
 * so createScopedClient's internal call to createServiceClient() is NOT
 * interceptable via vi.mock's partial-replacement (a same-module function
 * reference isn't rebound by mocking a sibling export). Use this instead,
 * and mock createScopedClient itself:
 *
 *   const { createScopedClient } = vi.hoisted(() => ({ createScopedClient: vi.fn() }))
 *   vi.mock("@/lib/server/supabase-rest", () => ({ createScopedClient }))
 *   createScopedClient.mockReturnValue(createFakeScopedClient("ws-1", { tableResponses: {...} }))
 *
 * The underlying fake client (for asserting on calls) is at `.raw`.
 */
export function createFakeScopedClient(workspaceId: string, opts: Parameters<typeof createFakeSupabase>[0] = {}) {
  const inner = createFakeSupabase(opts)

  function from(table: string) {
    const chain = inner.from(table) as Record<string, (...args: unknown[]) => unknown>
    return {
      select: (columns = "*", options?: unknown) => (chain.select(columns, options) as { eq: (...a: unknown[]) => unknown }).eq("workspace_id", workspaceId),
      insert: (data: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = (Array.isArray(data) ? data : [data]).map((r) => ({ ...r, workspace_id: workspaceId }))
        return chain.insert(rows)
      },
      upsert: (data: Record<string, unknown> | Record<string, unknown>[], options?: unknown) => {
        const rows = (Array.isArray(data) ? data : [data]).map((r) => ({ ...r, workspace_id: workspaceId }))
        return chain.upsert(rows, options)
      },
      update: (data: Record<string, unknown>) => (chain.update(data) as { eq: (...a: unknown[]) => unknown }).eq("workspace_id", workspaceId),
      delete: () => (chain.delete() as { eq: (...a: unknown[]) => unknown }).eq("workspace_id", workspaceId),
      raw: chain,
    }
  }

  return { from, rpc: inner.rpc, raw: inner }
}
