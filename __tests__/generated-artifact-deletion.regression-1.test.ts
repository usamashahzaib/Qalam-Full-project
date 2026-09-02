import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// Regression: ISSUE-001 - saved generated outputs had no complete delete path
// Found by QA on 2026-09-02
// Report: .gstack/qa-reports/qa-report-localhost-2026-09-02.md

const query = vi.hoisted(() => {
  const chain: Record<string, unknown> = {}
  chain.eq = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.then = (resolve: (value: { data: null; error: null }) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve)
  return chain as {
    eq: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
})

const mocks = vi.hoisted(() => ({
  requirePlan: vi.fn(),
  authorizeRole: vi.fn(),
  from: vi.fn(() => query),
}))

vi.mock("@/lib/server/auth", () => ({
  withAuth: (handler: (request: NextRequest, user: { id: string }) => Promise<Response>) =>
    (request: NextRequest) => handler(request, { id: "user-1" }),
}))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan: mocks.requirePlan }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole: mocks.authorizeRole }))
vi.mock("@/lib/server/supabase-rest", () => ({
  createScopedClient: () => ({ from: mocks.from }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requirePlan.mockResolvedValue({ ok: true, workspaceId: "workspace-1", plan: "Pro" })
  mocks.authorizeRole.mockResolvedValue(null)
})

describe("generated artifact deletion", () => {
  it("deletes a saved content analysis inside the active workspace", async () => {
    const { DELETE } = await import("@/app/api/career/content-intelligence/route")
    const response = await DELETE(new NextRequest("http://localhost/api/career/content-intelligence?id=analysis-1", { method: "DELETE" }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mocks.authorizeRole).toHaveBeenCalledWith(expect.any(NextRequest), "workspace-1", "editor")
    expect(mocks.from).toHaveBeenCalledWith("career_content_imports")
    expect(query.delete).toHaveBeenCalledOnce()
    expect(query.eq).toHaveBeenCalledWith("id", "analysis-1")
  })

  it("archives the requested saved career output and checks its tool type", async () => {
    const { DELETE } = await import("@/app/api/career/addon-tools/[tool]/route")
    const response = await DELETE(
      new NextRequest("http://localhost/api/career/addon-tools/interview-prep?id=artifact-1", { method: "DELETE" }),
      { params: Promise.resolve({ tool: "interview-prep" }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mocks.from).toHaveBeenCalledWith("career_addon_artifacts")
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: "archived" }))
    expect(query.eq).toHaveBeenCalledWith("id", "artifact-1")
    expect(query.eq).toHaveBeenCalledWith("addon_key", "interview_pack")
  })

  it("rejects delete requests without an artifact id", async () => {
    const { DELETE } = await import("@/app/api/career/content-intelligence/route")
    const response = await DELETE(new NextRequest("http://localhost/api/career/content-intelligence", { method: "DELETE" }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Analysis id is required." })
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
