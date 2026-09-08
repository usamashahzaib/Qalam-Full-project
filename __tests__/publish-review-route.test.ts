import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ admin: vi.fn(), select: vi.fn(), insert: vi.fn(), rpc: vi.fn() }))
vi.mock("@/lib/server/workspace", () => ({ requireAdminOps: mocks.admin }))
vi.mock("@/lib/server/supabase-rest", () => ({
  supabaseSelect: mocks.select,
  supabaseInsert: mocks.insert,
  createServiceClient: () => ({ rpc: mocks.rpc }),
}))
import { GET, PATCH } from "@/app/api/admin/publish-reviews/route"

const request = (method: "GET" | "PATCH", body?: unknown) => new NextRequest("https://app.byqalam.com/api/admin/publish-reviews", {
  method,
  headers: { "x-admin-key": "key", ...(body ? { "content-type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
})

describe("publish review admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin.mockResolvedValue({ email: "admin@example.com", userId: "admin" })
    mocks.select.mockResolvedValue([])
    mocks.insert.mockResolvedValue([])
    mocks.rpc.mockResolvedValue({ data: true, error: null })
  })

  it("hides the queue when admin authentication fails", async () => {
    mocks.admin.mockRejectedValue(new Error("Forbidden"))
    expect((await GET(request("GET"))).status).toBe(404)
  })

  it("requires a verification note before resolving", async () => {
    const response = await PATCH(request("PATCH", { postId: "post", resolution: "published", note: "" }))
    expect(response.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("uses the atomic resolver and records the admin decision", async () => {
    const response = await PATCH(request("PATCH", { postId: "post", resolution: "published", postUrn: "urn:li:1", note: "Verified on the company feed" }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith("resolve_publish_outcome_review", expect.objectContaining({ p_post_id: "post", p_resolution: "published" }))
    expect(mocks.insert).toHaveBeenCalledWith("admin_audit_log", expect.objectContaining({ action: "resolve_publish_outcome" }), "return=minimal")
  })

  it("returns a conflict when another process already resolved the row", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null })
    expect((await PATCH(request("PATCH", { postId: "post", resolution: "not_published", note: "Confirmed absent in activity" }))).status).toBe(409)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
