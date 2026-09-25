import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ after: vi.fn(), store: vi.fn(), requirePlan: vi.fn() }))
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: mocks.after }))
vi.mock("@/lib/server/workspace", () => ({
  requireAuth: vi.fn(async () => "user-1"),
  getWorkspaceSessionContext: vi.fn(async () => ({ supabaseUserId: "sb-user-1" })),
  resolveWorkspaceId: vi.fn(async () => "ws-1"),
}))
vi.mock("@/lib/server/roles", () => ({ requireRole: vi.fn(async () => undefined) }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan: mocks.requirePlan }))
vi.mock("@/lib/server/embeddings", () => ({ storeVoiceExamples: mocks.store }))
const chain = { select: () => chain, or: () => chain, limit: () => chain, maybeSingle: async () => ({ data: null }), insert: async () => ({ error: null }), update: () => ({ eq: async () => ({ error: null }) }) }
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: () => ({ from: () => chain }), createScopedClient: () => ({ from: () => chain }) }))
import { POST } from "@/app/api/voice/save/route"

const request = (body: Record<string, unknown>) => new NextRequest("https://app.byqalam.com/api/voice/save", { method: "POST", body: JSON.stringify(body) })

describe("voice save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePlan.mockResolvedValue({ ok: true })
    mocks.store.mockResolvedValue(undefined)
  })

  it("registers sample storage with after() so a frozen function cannot drop it", async () => {
    const response = await POST(request({ name: "A", examplePosts: "Post one.\n---\nPost two.", characteristics: { tone: "Dry" } }))
    expect(response.status).toBe(200)
    expect(mocks.store).not.toHaveBeenCalled()
    expect(mocks.after).toHaveBeenCalledOnce()
    await mocks.after.mock.calls[0][0]()
    expect(mocks.store).toHaveBeenCalledWith("ws-1", "sb-user-1", "Post one.\n---\nPost two.")
  })

  it("schedules nothing for a basic profile save", async () => {
    await POST(request({ name: "A", title: "Head of Ops" }))
    expect(mocks.after).not.toHaveBeenCalled()
  })
})
