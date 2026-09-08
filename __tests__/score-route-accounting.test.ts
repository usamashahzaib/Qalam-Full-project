import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ score: vi.fn(), increment: vi.fn(), decrement: vi.fn(), queue: vi.fn(), cacheWrite: vi.fn() }))
vi.mock("@/lib/server/auth", () => ({ withAuth: (handler: (req: NextRequest, user: { id: string }) => unknown) => (req: NextRequest) => handler(req, { id: "user" }) }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan: vi.fn().mockResolvedValue({ ok: true, workspaceId: "workspace", billingUserId: "owner", plan: "Pro" }) }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/use-cases/score-post", () => ({ scorePost: mocks.score }))
vi.mock("@/lib/server/plan-limits-v2", () => ({ incrementUsage: mocks.increment, decrementUsage: mocks.decrement }))
vi.mock("@/lib/server/queue", () => ({ enqueueRequest: mocks.queue }))
vi.mock("@/lib/server/cache", () => ({ generateCacheKey: JSON.stringify, getCachedResult: vi.fn().mockResolvedValue(null), setCachedResult: mocks.cacheWrite }))
import { POST } from "@/app/api/generate/score/route"

const request = (content = "A valid post to score.") => new NextRequest("https://app.byqalam.com/api/generate/score", { method: "POST", body: JSON.stringify({ content }) })

describe("scoring quota accounting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.increment.mockResolvedValue({ allowed: true })
    mocks.decrement.mockResolvedValue(undefined)
    mocks.queue.mockResolvedValue({ rateLimited: false })
    mocks.cacheWrite.mockResolvedValue(undefined)
    mocks.score.mockResolvedValue({ ok: true, data: { scores: { human: 50 }, overall: 50, tips: {}, hashtags: [] } })
  })
  it("rejects invalid content before charging quota", async () => {
    expect((await POST(request("x"))).status).toBe(400)
    expect(mocks.increment).not.toHaveBeenCalled()
  })
  it("refunds a queue rate limit", async () => {
    mocks.queue.mockResolvedValue({ rateLimited: true })
    expect((await POST(request())).status).toBe(429)
    expect(mocks.decrement).toHaveBeenCalledExactlyOnceWith("owner", "analyses")
    expect(mocks.score).not.toHaveBeenCalled()
  })
  it.each(["queue", "score"] as const)("refunds a thrown %s failure", async (stage) => {
    mocks[stage].mockRejectedValue(new Error("unavailable"))
    await expect(POST(request())).rejects.toThrow("unavailable")
    expect(mocks.decrement).toHaveBeenCalledExactlyOnceWith("owner", "analyses")
  })
  it("returns a completed score when the optional cache write fails", async () => {
    mocks.cacheWrite.mockRejectedValue(new Error("cache unavailable"))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).overall).toBe(50)
    expect(mocks.decrement).not.toHaveBeenCalled()
  })
})
