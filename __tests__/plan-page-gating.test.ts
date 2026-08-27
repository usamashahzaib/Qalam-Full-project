import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

// PlanGate/LockedFeature are JSX-instantiated gates: the string check below is
// tight (there is no "call it but discard the result" failure mode for a
// wrapping component the way there is for imperative auth checks), so it
// stays source-based. The underlying hasFeatureAccess logic itself is
// exercised directly in __tests__/entitlements.test.ts.
const gatedLayouts = {
  analytics: "Solo",
  calendar: "Solo",
  library: "Solo",
  approvals: "Pro",
  chat: "Pro",
  competitors: "Pro",
} as const

describe("paid page gating", () => {
  for (const [route, plan] of Object.entries(gatedLayouts)) {
    it(`gates ${route} at ${plan}`, () => {
      const layoutSource = source(`app/(app)/${route}/layout.tsx`)
      expect(layoutSource).toContain(`requiredPlan="${plan}"`)
    })
  }
})

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

const { createServiceClient } = vi.hoisted(() => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient }))

beforeEach(() => {
  vi.clearAllMocks()
  requireAuthApi.mockResolvedValue({
    userId: "user-1",
    externalUserId: "ext-1",
    error: null,
    session: { id: "user-1" },
  })
})

const getRecruiterSearch = async (query = "") => {
  const mod = await import("@/app/api/career/recruiter-search/route")
  const request = new NextRequest(`http://localhost/api/career/recruiter-search${query}`, { method: "GET" })
  return mod.GET(request)
}

describe("career network split access", () => {
  it("keeps candidate visibility source-gated at Free", () => {
    const layout = source("app/(app)/career/network/layout.tsx")
    expect(layout).toContain('requiredPlan="Free"')
  })

  it("blocks recruiter search below Pro", async () => {
    requirePlan.mockResolvedValue({ ok: false, response: Response.json({ error: "upgrade_required" }, { status: 403 }) })

    const res = await getRecruiterSearch()

    expect(res.status).toBe(403)
  })

  it("blocks a Pro user with no verified recruiter/employer organization", async () => {
    requirePlan.mockResolvedValue({ ok: true, plan: "Pro" })
    createServiceClient.mockReturnValue(
      createFakeSupabase({ tableResponses: { career_organization_members: () => ok(null) } })
    )

    const res = await getRecruiterSearch()

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: "verified_recruiter_required" })
  })

  it("blocks a Pro user whose organization is not yet verified", async () => {
    requirePlan.mockResolvedValue({ ok: true, plan: "Pro" })
    createServiceClient.mockReturnValue(
      createFakeSupabase({
        tableResponses: {
          career_organization_members: () =>
            ok({ organization_id: "org-1", organization: { verification_status: "pending", organization_type: "employer" } }),
        },
      })
    )

    const res = await getRecruiterSearch()

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: "verified_recruiter_required" })
  })

  it("allows a Pro user with a verified employer/recruiter organization through", async () => {
    requirePlan.mockResolvedValue({ ok: true, plan: "Pro" })
    createServiceClient.mockReturnValue(
      createFakeSupabase({
        tableResponses: {
          career_organization_members: () =>
            ok({ organization_id: "org-1", organization: { verification_status: "verified", organization_type: "recruiter" } }),
          candidate_visibility: () => ok([]),
        },
      })
    )

    const res = await getRecruiterSearch()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ candidates: [] })
  })
})
