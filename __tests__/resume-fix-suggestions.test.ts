import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { weakResume } from "./fixtures/ats-resumes"

const mocks = vi.hoisted(() => ({ callAi: vi.fn() }))

vi.mock("@/lib/server/auth", () => ({
  withAuth:
    (handler: (request: NextRequest, user: { id: string }) => Promise<Response>) =>
    (request: NextRequest) =>
      handler(request, { id: "user-1" }),
}))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan: async () => ({ ok: true, workspaceId: "w-1", plan: "Free" }) }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole: async () => null }))
vi.mock("@/lib/server/ai-router-v2", () => ({ callAi: mocks.callAi, safeParseJson: (raw: string) => JSON.parse(raw) }))

const post = async (payload: Record<string, unknown>) => {
  const { POST } = await import("@/app/api/career/resumes/fix-suggestions/route")
  return POST(new NextRequest("http://localhost/api/career/resumes/fix-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }))
}

beforeEach(() => {
  mocks.callAi.mockReset()
})

describe("resume fix suggestions", () => {
  it("sends only the flagged lines and returns cleaned options for them", async () => {
    mocks.callAi.mockResolvedValue(JSON.stringify({
      suggestions: [
        { id: "b-0-1", options: ["- Owned the plant budget of [budget amount]—tracked monthly", 42] },
        { id: "not-a-target", options: ["Invented line"] },
      ],
    }))
    const response = await post({ checkId: "quantified_results", targetRole: "Administration Manager", resumeData: weakResume })
    expect(response.status).toBe(200)

    const prompt = String(mocks.callAi.mock.calls[0][2])
    expect(prompt).toContain("id=b-0-1")
    expect(prompt).toContain("Never invent a number")

    const body = await response.json()
    expect(body.suggestions).toEqual([{ id: "b-0-1", options: ["Owned the plant budget of [budget amount]-tracked monthly"] }])
  })

  it("does not call the model for checks that are fixed without rewriting", async () => {
    const response = await post({ checkId: "contact_block", resumeData: weakResume })
    expect(await response.json()).toEqual({ suggestions: [] })
    expect(mocks.callAi).not.toHaveBeenCalled()
  })
})
