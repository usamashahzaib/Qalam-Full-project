import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ generate: vi.fn(), cacheKey: vi.fn(), plan: { ok: true, workspaceId: "client-a", billingUserId: "agency-owner", plan: "Agency" } }))
vi.mock("@/lib/server/auth", () => ({ withAuth: (handler: (req: NextRequest, user: { id: string }) => unknown) => (req: NextRequest) => handler(req, { id: "team-member" }) }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan: vi.fn(async () => mocks.plan) }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/server/voice-profile", () => ({ getWorkspaceVoiceProfile: vi.fn(async () => undefined) }))
vi.mock("@/lib/server/queue", () => ({ enqueueRequest: vi.fn(async () => ({ rateLimited: false })) }))
vi.mock("@/lib/server/cache", () => ({ generateCacheKey: mocks.cacheKey, getCachedResult: vi.fn(async () => null), setCachedResult: vi.fn(async () => undefined) }))
vi.mock("@/lib/use-cases/generate-hooks", () => ({ generateHooks: mocks.generate }))
import { POST } from "@/app/api/generate/hooks/route"

const request = () => new NextRequest("https://app.byqalam.com/api/generate/hooks", { method: "POST", body: JSON.stringify({ topic: "why most startups hire too early" }) })

describe("hooks route scope", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheKey.mockImplementation((params: Record<string, unknown>) => JSON.stringify(params))
    mocks.generate.mockResolvedValue({ ok: true, data: { hooks: [{ style: "DIRECT", text: "Hire later." }], remaining: 4 } })
  })

  it("charges hook usage to the billing account, not the team member", async () => {
    await POST(request())
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ userId: "agency-owner" }))
  })

  it("caches hooks per workspace and plan, since they carry that workspace's voice", async () => {
    await POST(request())
    expect(mocks.cacheKey).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "client-a", plan: "Agency" }))
  })
})
