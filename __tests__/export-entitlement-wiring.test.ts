import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { getPlanLimits } from "@/lib/entitlements"
import { createFakeScopedClient, ok } from "./mocks/supabase-client"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

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

const { createScopedClient } = vi.hoisted(() => ({ createScopedClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createScopedClient }))

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
  // No carousel matches - the test only needs to confirm the request gets
  // past the entitlement gate, not that PDF generation succeeds.
  createScopedClient.mockReturnValue(createFakeScopedClient("ws-1", { tableResponses: { carousels: () => ok(null) } }))
})

const postPdfRequest = async () => {
  const mod = await import("@/app/api/carousel/[id]/pdf/route")
  const request = new NextRequest("http://localhost/api/carousel/c-1/pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  })
  return mod.POST(request, { params: Promise.resolve({ id: "c-1" }) })
}

describe("PDF export entitlement wiring", () => {
  it("keeps PDF export Pro-only in canonical limits", () => {
    expect(getPlanLimits("Free").canExport).toBe(false)
    expect(getPlanLimits("Solo").canExport).toBe(false)
    expect(getPlanLimits("Pro").canExport).toBe(true)
    expect(getPlanLimits("Agency").canExport).toBe(true)
  })

  it("blocks the PDF route with upgrade_required when the plan lacks canExport", async () => {
    requirePlan.mockResolvedValue({ ok: true, limits: { canExport: false } })

    const res = await postPdfRequest()

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: "upgrade_required", requiredFeature: "export" })
    // Never reached the role/workspace check - the entitlement gate is upstream of it.
    expect(requireRole).not.toHaveBeenCalled()
  })

  it("lets the PDF route through the entitlement gate when the plan has canExport", async () => {
    requirePlan.mockResolvedValue({ ok: true, limits: { canExport: true } })

    const res = await postPdfRequest()

    // Falls through to "carousel not found" (404) rather than the entitlement
    // gate's 403 - proving canExport:true actually clears the gate.
    expect(res.status).toBe(404)
    expect(requireRole).toHaveBeenCalledWith(expect.anything(), "ws-1", "viewer")
  })

  it("checks the export flag after authentication instead of hard-blocking overrides", () => {
    const route = source("app/api/carousel/[id]/pdf/route.ts")
    expect(route).toContain('requirePlan(req, "Free")')
    expect(route).toContain("planCheck.limits.canExport")
  })

  it("locks both carousel PDF controls to Pro", () => {
    const editor = source("app/(app)/carousels/[id]/page.tsx")
    const writer = source("app/(app)/writer/page.tsx")
    expect(editor).toContain('<LockedFeature feature="Export to PDF" requiredPlan="Pro"')
    expect(writer).toContain('<LockedFeature feature="Export to PDF" requiredPlan="Pro"')
  })
})
