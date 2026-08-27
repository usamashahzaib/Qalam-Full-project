import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createFakeScopedClient, ok } from "./mocks/supabase-client"

const { requirePlan } = vi.hoisted(() => ({ requirePlan: vi.fn() }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan }))

const { createScopedClient } = vi.hoisted(() => ({ createScopedClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createScopedClient }))

// errorToStatus is a pure formatter never reached in these tests (requirePlan
// always resolves ok) - stubbed only to avoid pulling in roles.ts's real
// import chain (workspace.ts -> @/auth), which this test has no reason to load.
vi.mock("@/lib/server/roles", () => ({ errorToStatus: () => 500 }))

beforeEach(() => {
  vi.clearAllMocks()
  requirePlan.mockResolvedValue({ ok: true, workspaceId: "ws-1" })
})

const getLibrary = async (query: string) => {
  const fake = createFakeScopedClient("ws-1", { tableResponses: { posts: () => ok([]) } })
  createScopedClient.mockReturnValue(fake)
  const mod = await import("@/app/api/library/route")
  const request = new NextRequest(`http://localhost/api/library${query}`)
  const res = await mod.GET(request)
  const chain = fake.raw.from.mock.results[0].value as {
    select: { mock: { calls: unknown[][] } }
    ilike: { mock: { calls: unknown[][] } }
    or: { mock: { calls: unknown[][] } }
  }
  return { res, chain }
}

describe("library route schema", () => {
  it("selects only real post columns - no deleted_at, which doesn't exist on posts", async () => {
    const { chain } = await getLibrary("")
    const selectedColumns = chain.select.mock.calls[0][0] as string
    expect(selectedColumns).not.toContain("deleted_at")
  })

  it("filters carousels through the metadata JSON column, not a non-existent type column", async () => {
    const { chain } = await getLibrary("?type=carousel")
    expect(chain.ilike.mock.calls[0]).toEqual(["metadata->>type", "%carousel%"])
  })

  it("excludes carousels the same way for every other type filter", async () => {
    const { chain } = await getLibrary("?type=post")
    expect(chain.or.mock.calls[0][0]).toContain("metadata->>type")
  })

  it("scopes the query to the caller's workspace", async () => {
    const { chain } = await getLibrary("")
    expect(chain.eq.mock.calls).toContainEqual(["workspace_id", "ws-1"])
  })
})
