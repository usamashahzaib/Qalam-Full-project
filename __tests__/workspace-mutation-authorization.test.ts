import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { createFakeSupabase, createFakeScopedClient, ok } from "./mocks/supabase-client"

// This suite used to grep route source for `requireRole(...)` / `authorizeRole(...)`
// call text - a check that passes even if the call's result is discarded or the
// call sits behind `if (false)`. These tests instead invoke each real route
// handler with a session belonging to a workspace "viewer" (below the required
// "editor" role, per the hierarchy in lib/server/roles.ts) and assert it
// actually returns 403 - so a regression that stops enforcing the role check
// makes the test fail for the right reason.
//
// Everything upstream of the authorization decision (identity, workspace
// resolution, plan-tier gating) is mocked to a fixed passing user/workspace,
// isolating the one property under test: role enforcement. Those upstream
// concerns have their own coverage elsewhere (require-plan.test.ts, roles.test.ts).

const { getWorkspaceSessionContext, resolveWorkspaceId, requireAuth } = vi.hoisted(() => ({
  getWorkspaceSessionContext: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  requireAuth: vi.fn(),
}))
vi.mock("@/lib/server/workspace", () => ({
  getWorkspaceSessionContext,
  resolveWorkspaceId,
  requireAuth,
}))

const { requireAuthApi } = vi.hoisted(() => ({ requireAuthApi: vi.fn() }))
vi.mock("@/lib/server/auth", () => ({
  requireAuthApi,
  // Real implementation just forwards to requireAuthApi and dispatches - no
  // need to exercise the real one, which pulls in NextAuth + Supabase directly.
  withAuth: (handler: (req: NextRequest, user: unknown) => Promise<Response>) =>
    async (req: NextRequest) => {
      const { error, session } = await requireAuthApi(req)
      if (error) return error
      return handler(req, session)
    },
}))

const { requirePlan } = vi.hoisted(() => ({ requirePlan: vi.fn() }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan }))

// app/api/generate/route.ts PATCH layers a second, post-level authorization
// check on top of the workspace role gate - out of scope for this suite
// (which targets the role gate specifically), so it's stubbed to pass.
vi.mock("@/lib/domain/services/authorization", () => ({
  canAccessPost: vi.fn(async () => ({ ok: true, data: true })),
  canAccessWorkspace: vi.fn(async () => ({ ok: true, data: true })),
}))

const { supabaseSelect, createServiceClient, createScopedClient } = vi.hoisted(() => ({
  supabaseSelect: vi.fn(),
  createServiceClient: vi.fn(),
  createScopedClient: vi.fn(),
}))
vi.mock("@/lib/server/supabase-rest", () => ({
  supabaseSelect,
  supabasePatch: vi.fn(),
  supabaseInsert: vi.fn(),
  supabaseUpsert: vi.fn(),
  supabaseDelete: vi.fn(),
  supabaseCount: vi.fn(),
  createServiceClient,
  createScopedClient,
  sanitizeOrFilterValue: (v: string) => v,
}))

let currentRole = "viewer"

beforeEach(() => {
  vi.clearAllMocks()
  currentRole = "viewer"

  getWorkspaceSessionContext.mockResolvedValue({
    userId: "user-1",
    email: "u@example.com",
    fullName: "Test User",
    firstName: "Test",
    imageUrl: null,
    role: "user",
    supabaseUserId: "user-1",
  })
  resolveWorkspaceId.mockResolvedValue("ws-1")
  requireAuth.mockResolvedValue("user-1")
  requireAuthApi.mockResolvedValue({
    userId: "user-1",
    externalUserId: "ext-1",
    error: null,
    session: {
      id: "user-1",
      externalId: "ext-1",
      email: "u@example.com",
      name: "Test User",
      plan: "Pro",
      workspaceId: "ws-1",
      avatarUrl: null,
      provider: "credentials",
    },
  })

  // Any plan-limit field any route happens to check reads as allowed - plan
  // gating is a separate concern with its own tests.
  const permissiveLimits = new Proxy({}, { get: () => true }) as never
  requirePlan.mockResolvedValue({
    ok: true,
    session: {},
    workspaceId: "ws-1",
    plan: "Pro",
    status: "active",
    limits: permissiveLimits,
    isActive: true,
    expiresAt: null,
    renewalDue: false,
    daysUntilExpiry: null,
    overrideActive: false,
    planExpired: false,
  })

  supabaseSelect.mockImplementation(async (table: string) => {
    if (table === "workspace_members") return [{ role: currentRole, workspace_id: "ws-1" }]
    return []
  })

  // Only the versions/restore route reads the owning post before checking
  // role, to discover which workspace to check against.
  createServiceClient.mockReturnValue(
    createFakeSupabase({
      tableResponses: {
        posts: () => ok({ workspace_id: "ws-1", content: "hello" }),
      },
    })
  )
  // Post-role-check queries in routes migrated to createScopedClient (e.g.
  // analytics/route.ts) - empty/null responses are fine here, these tests
  // only assert on the role gate's own status code, not what happens after.
  createScopedClient.mockReturnValue(
    createFakeScopedClient("ws-1", {
      tableResponses: {
        posts: () => ok({ id: "post-1", workspace_id: "ws-1" }),
      },
    })
  )
})

type RouteCase = {
  file: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  params?: Record<string, string>
  // Only needed where the route's own zod schema would 400 on an empty body
  // before ever reaching the role check.
  body?: Record<string, unknown>
}

const CASES: RouteCase[] = [
  { file: "@/app/api/linkedin/token/route", method: "DELETE" },
  { file: "@/app/api/posts/reschedule/route", method: "POST" },
  { file: "@/app/api/posts/unschedule/route", method: "POST" },
  { file: "@/app/api/posts/duplicate/route", method: "POST" },
  { file: "@/app/api/voice-profile/route", method: "PUT" },
  { file: "@/app/api/events/route", method: "POST", body: { type: "test_event" } },
  { file: "@/app/api/jobs/route", method: "POST" },
  { file: "@/app/api/jobs/route", method: "DELETE" },
  { file: "@/app/api/analytics/route", method: "POST" },
  { file: "@/app/api/analytics/route", method: "DELETE" },
  { file: "@/app/api/generate/route", method: "POST", body: { topic: "A valid topic", role: "Founder" } },
  { file: "@/app/api/generate/route", method: "PATCH", body: { id: "00000000-0000-4000-8000-000000000000" } },
  { file: "@/app/api/generate/carousel/route", method: "POST" },
  { file: "@/app/api/generate/cta-rewrite/route", method: "POST" },
  { file: "@/app/api/generate/hooks/route", method: "POST" },
  { file: "@/app/api/generate/improve/route", method: "POST" },
  { file: "@/app/api/generate/post/route", method: "POST" },
  { file: "@/app/api/generate/score/route", method: "POST" },
  {
    file: "@/app/api/posts/[id]/versions/[versionId]/restore/route",
    method: "POST",
    params: { id: "post-1", versionId: "v-1" },
  },
  { file: "@/app/api/voice/analyze/route", method: "POST" },
  { file: "@/app/api/voice/import-document/route", method: "POST" },
]

const invoke = async ({ file, method, params, body }: RouteCase) => {
  const mod = (await import(/* @vite-ignore */ file)) as Record<string, (
    req: NextRequest,
    ctx?: { params: Promise<Record<string, string>> }
  ) => Promise<Response>>
  const handler = mod[method]
  const request = new NextRequest("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  })
  return params ? handler(request, { params: Promise.resolve(params) }) : handler(request)
}

describe("workspace mutation authorization", () => {
  it.each(CASES)("$file ($method) rejects a viewer with 403", async (testCase) => {
    currentRole = "viewer"
    const res = await invoke(testCase)
    expect(res.status).toBe(403)
  })

  it.each(CASES)("$file ($method) allows an editor through", async (testCase) => {
    currentRole = "editor"
    const res = await invoke(testCase)
    expect(res.status).not.toBe(403)
  })
})
