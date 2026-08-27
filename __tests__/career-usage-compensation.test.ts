import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createFakeScopedClient, ok, fail } from "./mocks/supabase-client"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const helper = read("lib/server/career-usage.ts")

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

const { authorizeRole } = vi.hoisted(() => ({ authorizeRole: vi.fn() }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole }))

const { consumeCareerUsage, refundCareerUsage, claimExtraResumeCredit, releaseExtraResumeCredit } = vi.hoisted(() => ({
  consumeCareerUsage: vi.fn(),
  refundCareerUsage: vi.fn(),
  claimExtraResumeCredit: vi.fn(),
  releaseExtraResumeCredit: vi.fn(),
}))
vi.mock("@/lib/server/career-usage", () => ({
  consumeCareerUsage,
  refundCareerUsage,
  claimExtraResumeCredit,
  releaseExtraResumeCredit,
}))

const { callAi, safeParseJson } = vi.hoisted(() => ({ callAi: vi.fn(), safeParseJson: vi.fn() }))
vi.mock("@/lib/server/ai-router-v2", () => ({ callAi, safeParseJson }))

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
  requirePlan.mockResolvedValue({ ok: true, plan: "Pro", workspaceId: "ws-1" })
  authorizeRole.mockResolvedValue(null)
  // Usage consumed from the monthly quota (not an extra credit), so a
  // rollback should call refundCareerUsage and never releaseExtraResumeCredit.
  consumeCareerUsage.mockResolvedValue({ allowed: true })
})

describe("career usage compensation", () => {
  it("exposes quota and add-on rollback helpers", () => {
    expect(helper).toContain("refundCareerUsage")
    expect(helper).toContain("claimExtraResumeCredit")
    expect(helper).toContain("releaseExtraResumeCredit")
  })

  it("refunds the generated-resume reservation when the AI call throws", async () => {
    createScopedClient.mockReturnValue(createFakeScopedClient("ws-1", { tableResponses: { career_profiles: () => ok(null) } }))
    callAi.mockRejectedValue(new Error("provider_unavailable"))

    const mod = await import("@/app/api/career/resumes/generate/route")
    const request = new NextRequest("http://localhost/api/career/resumes/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Targeted Resume",
        templateKey: "clean",
        targetRole: "Engineering Manager",
        jobDescription: "x".repeat(90),
        sourceResume: "x".repeat(210),
      }),
    })

    await expect(mod.POST(request)).rejects.toThrow("provider_unavailable")

    expect(refundCareerUsage).toHaveBeenCalledWith("user-1", "resume_generation")
    expect(releaseExtraResumeCredit).not.toHaveBeenCalled()
  })

  it("refunds the generated-resume reservation when saving the document fails", async () => {
    createScopedClient.mockReturnValue(
      createFakeScopedClient("ws-1", {
        tableResponses: {
          career_profiles: () => ok(null),
          resume_documents: () => fail("insert failed"),
        },
      })
    )
    callAi.mockResolvedValue('{"resume":{},"analysis":{}}')
    safeParseJson.mockReturnValue({ resume: {}, analysis: {} })

    const mod = await import("@/app/api/career/resumes/generate/route")
    const request = new NextRequest("http://localhost/api/career/resumes/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Targeted Resume",
        templateKey: "clean",
        targetRole: "Engineering Manager",
        jobDescription: "x".repeat(90),
        sourceResume: "x".repeat(210),
      }),
    })

    const res = await mod.POST(request)

    expect(res.status).toBe(500)
    expect(refundCareerUsage).toHaveBeenCalledWith("user-1", "resume_generation")
  })

  it("releases the extra-credit reservation (not the monthly quota) when the manual resume save fails", async () => {
    consumeCareerUsage.mockResolvedValue({ allowed: false })
    claimExtraResumeCredit.mockResolvedValue("credit-order-1")
    createScopedClient.mockReturnValue(
      createFakeScopedClient("ws-1", { tableResponses: { resume_documents: () => fail("insert failed") } })
    )

    const mod = await import("@/app/api/career/resumes/route")
    const request = new NextRequest("http://localhost/api/career/resumes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Manual Resume", templateKey: "clean", resumeData: {} }),
    })

    const res = await mod.POST(request)

    expect(res.status).toBe(500)
    expect(releaseExtraResumeCredit).toHaveBeenCalledWith("user-1", "credit-order-1")
    expect(refundCareerUsage).not.toHaveBeenCalled()
  })
})
