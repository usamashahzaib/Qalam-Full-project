import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const admin = vi.fn()
const embedding = vi.fn()
const from = vi.fn()
vi.mock("@/lib/server/workspace", () => ({ requireAdminRequest: (...args: unknown[]) => admin(...args) }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: () => ({ from }) }))
vi.mock("@/lib/server/embeddings", () => ({ generateEmbedding: (...args: unknown[]) => embedding(...args) }))

import { GET, POST, DELETE } from "@/app/api/admin/writing-library/route"

const request = (method: string, body?: unknown, query = "") => new NextRequest(`https://example.test/api/admin/writing-library${query}`, {
  method, ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
})

beforeEach(() => { vi.resetAllMocks(); admin.mockResolvedValue({ email: "admin@example.test" }) })

describe("writing library access and export", () => {
  it("rejects non-admin reads, writes and removals before accessing data or embedding APIs", async () => {
    admin.mockRejectedValue(new Error("not_found"))
    expect((await GET(request("GET"))).status).toBe(404)
    expect((await POST(request("POST", {}))).status).toBe(404)
    expect((await DELETE(request("DELETE", {}))).status).toBe(404)
    expect(from).not.toHaveBeenCalled()
    expect(embedding).not.toHaveBeenCalled()
  })
  it("rejects missing permissions before sending text to the embedding provider", async () => {
    expect((await POST(request("POST", { finalText: "Not an approved record" }))).status).toBe(400)
    expect(embedding).not.toHaveBeenCalled()
  })
  it("exports only the requested split with current training permission and no-store headers", async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const method of ["select", "eq", "is", "or", "order"]) query[method] = vi.fn(() => query)
    query.range = vi.fn(async () => ({ data: [{ id: "one", brief: "Explain backups", facts: "None", final_text: "Test the restore before you need it." }], error: null }))
    from.mockReturnValue(query)
    const response = await GET(request("GET", undefined, "?export=test"))
    expect(response.status).toBe(200)
    expect(query.eq).toHaveBeenCalledWith("split", "test")
    expect(query.eq).toHaveBeenCalledWith("training_allowed", true)
    expect(query.is).toHaveBeenCalledWith("revoked_at", null)
    expect(query.or.mock.calls[0][0]).toContain("permission_expires_at.gt.")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(JSON.parse((await response.text()).trim()).messages[2].content).toContain("Test the restore")
  })
})
