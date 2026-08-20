import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

const { requireAuthApi } = vi.hoisted(() => ({ requireAuthApi: vi.fn() }))
vi.mock("@/lib/server/auth", () => ({
  requireAuthApi,
  withAuth: (handler: (req: NextRequest, user: unknown) => Promise<Response>) =>
    async (req: NextRequest) => {
      const { error, session } = await requireAuthApi(req)
      if (error) return error
      return handler(req, session)
    },
}))

const { requirePlan } = vi.hoisted(() => ({ requirePlan: vi.fn() }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan }))

const { resolveWorkspaceId, requireRole } = vi.hoisted(() => ({
  resolveWorkspaceId: vi.fn(),
  requireRole: vi.fn(),
}))
vi.mock("@/lib/server/workspace", () => ({ resolveWorkspaceId }))
vi.mock("@/lib/server/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/roles")>()
  return { ...actual, requireRole }
})

const { createServiceClient } = vi.hoisted(() => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient }))

const { checkPlanLimit, incrementUsage, decrementUsage } = vi.hoisted(() => ({
  checkPlanLimit: vi.fn(),
  incrementUsage: vi.fn(),
  decrementUsage: vi.fn(),
}))
vi.mock("@/lib/server/plan-limits-v2", () => ({ checkPlanLimit, incrementUsage, decrementUsage }))

const { checkWorkspaceUsage, incrementWorkspaceUsage } = vi.hoisted(() => ({
  checkWorkspaceUsage: vi.fn(),
  incrementWorkspaceUsage: vi.fn(),
}))
vi.mock("@/lib/server/workspace-usage", () => ({ checkWorkspaceUsage, incrementWorkspaceUsage }))

const { callAi } = vi.hoisted(() => ({ callAi: vi.fn() }))
vi.mock("@/lib/server/ai-router-v2", () => ({ callAi }))

beforeEach(() => {
  vi.clearAllMocks()
  requireAuthApi.mockResolvedValue({
    userId: "user-1",
    externalUserId: "ext-1",
    error: null,
    session: { id: "user-1", workspaceId: "ws-1" },
  })
  resolveWorkspaceId.mockResolvedValue("ws-1")
  requireRole.mockResolvedValue({ userId: "user-1", role: "editor" })
  createServiceClient.mockReturnValue(createFakeSupabase({ tableResponses: { carousels: () => ok(null) } }))
})

describe("carousel plan wiring", () => {
  it.each([
    { file: "@/app/api/carousel/[id]/route", method: "GET" as const },
    { file: "@/app/api/carousel/[id]/route", method: "PATCH" as const },
    { file: "@/app/api/carousel/[id]/route", method: "DELETE" as const },
    { file: "@/app/api/carousel/[id]/slides/[slideId]/route", method: "PATCH" as const },
    { file: "@/app/api/carousel/[id]/slides/[slideId]/route", method: "DELETE" as const },
  ])("$file $method rejects when requirePlan denies access", async ({ file, method }) => {
    requirePlan.mockResolvedValue({ ok: false, response: Response.json({ error: "upgrade_required" }, { status: 403 }) })
    const mod = (await import(/* @vite-ignore */ file)) as Record<string, (
      req: NextRequest,
      ctx: { params: Promise<Record<string, string>> }
    ) => Promise<Response>>
    const request = new NextRequest("http://localhost/api/test", {
      method,
      headers: { "content-type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify({}),
    })

    const res = await mod[method](request, { params: Promise.resolve({ id: "c-1", slideId: "s-1" }) })

    expect(res.status).toBe(403)
    // Never reached the workspace/role resolution - the plan gate is upstream.
    expect(requireRole).not.toHaveBeenCalled()
  })

  it("enforces the plan slide cap on the server", async () => {
    requirePlan.mockResolvedValue({
      ok: true,
      plan: "Solo",
      limits: { carouselGenerationsPerMonth: 5, carouselSlides: 5 },
    })

    const mod = await import("@/app/api/carousel/route")
    const request = new NextRequest("http://localhost/api/carousel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: "A valid topic", role: "Founder", slideCount: 8 }),
    })

    const res = await mod.POST(request)

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: "upgrade_required", requiredFeature: "carouselSlides", availableSlides: 5 })
    // Never reached quota checks or the AI call - the slide cap is upstream.
    expect(checkPlanLimit).not.toHaveBeenCalled()
    expect(callAi).not.toHaveBeenCalled()
  })

  it("allows a slideCount at the plan cap through to the quota check", async () => {
    requirePlan.mockResolvedValue({
      ok: true,
      plan: "Solo",
      limits: { carouselGenerationsPerMonth: 5, carouselSlides: 5 },
    })
    checkPlanLimit.mockResolvedValue({ allowed: false, current: 5, limit: 5 })

    const mod = await import("@/app/api/carousel/route")
    const request = new NextRequest("http://localhost/api/carousel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: "A valid topic", role: "Founder", slideCount: 5 }),
    })

    const res = await mod.POST(request)

    // Falls through to the quota-exceeded response (429), not the slide-cap
    // 403 - proving slideCount:5 actually clears the cap check.
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ error: "carousel_quota_exceeded" })
  })

  it("redirects the retired PDF route to the current editor", () => {
    const legacy = read("app/carousel/[id]/pdf/route.ts")
    expect(legacy).toContain("/carousels/")
    expect(legacy).not.toContain("carousel_projects")
  })

  it("caps client-side slide controls to the resolved plan limit", () => {
    const page = read("app/(app)/carousels/page.tsx")
    expect(page).toContain("max={maxSlides}")
    expect(page).toContain("useState(5)")
  })
})
