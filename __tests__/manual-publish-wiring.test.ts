import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const worker = read("lib/server/linkedin-publish.ts")

// A retry after a network failure mid-publish must never double-post to
// LinkedIn. The route tracks this with two flags: `claimed` (a DB claim was
// taken) and `sharedOnLinkedIn` (the post actually reached LinkedIn). The
// `finally` block only releases the claim when claimed but NOT shared - once
// LinkedIn has confirmed the post, the claim must survive even if the
// follow-up `finalize` RPC then fails, or a retry would re-claim and re-post.

const { requirePlan } = vi.hoisted(() => ({ requirePlan: vi.fn() }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan }))

const { getWorkspaceSessionContext, resolveWorkspaceId, requireRole } = vi.hoisted(() => ({
  getWorkspaceSessionContext: vi.fn(),
  resolveWorkspaceId: vi.fn(),
  requireRole: vi.fn(),
}))
vi.mock("@/lib/server/workspace", () => ({ getWorkspaceSessionContext, resolveWorkspaceId })) // requireRole comes from roles.ts
vi.mock("@/lib/server/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/roles")>()
  return { ...actual, requireRole }
})

const { postGet, postUpdate } = vi.hoisted(() => ({ postGet: vi.fn(), postUpdate: vi.fn() }))
vi.mock("@/lib/repositories/supabase/SupabasePostRepository", () => ({
  SupabasePostRepository: class {
    get = postGet
    update = postUpdate
  },
}))

const { acquireLinkedInPublishLock } = vi.hoisted(() => ({ acquireLinkedInPublishLock: vi.fn() }))
vi.mock("@/lib/server/linkedin-publish-lock", () => ({ acquireLinkedInPublishLock }))

const { shareToLinkedIn } = vi.hoisted(() => ({ shareToLinkedIn: vi.fn() }))
vi.mock("@/lib/server/linkedin", () => ({
  shareToLinkedIn,
  LinkedInApiError: class LinkedInApiError extends Error {
    status: number
    constructor(message: string, status = 502) {
      super(message)
      this.status = status
    }
  },
  LINKEDIN_MAX_POST_CHARS: 3000,
}))

const { ensureFreshLinkedInPublishingAccount, ensureFreshLinkedInToken } = vi.hoisted(() => ({
  ensureFreshLinkedInPublishingAccount: vi.fn(),
  ensureFreshLinkedInToken: vi.fn(),
}))
vi.mock("@/lib/server/linkedin-credentials", () => ({ ensureFreshLinkedInPublishingAccount, ensureFreshLinkedInToken }))

const { createServiceClient, supabaseInsert, supabaseSelect } = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  supabaseInsert: vi.fn(),
  supabaseSelect: vi.fn(),
}))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient, supabaseInsert, supabaseSelect }))

const rpc = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  requirePlan.mockResolvedValue({ ok: true, limits: { linkedinPublish: true } })
  getWorkspaceSessionContext.mockResolvedValue({ supabaseUserId: "user-1" })
  resolveWorkspaceId.mockResolvedValue("ws-1")
  requireRole.mockResolvedValue({ userId: "user-1", role: "editor" })
  postGet.mockResolvedValue({
    id: "post-1",
    content: "Ready to publish",
    status: "ready",
    engagement_score: 90,
    linkedin_post_id: null,
  })
  postUpdate.mockResolvedValue(null)
  acquireLinkedInPublishLock.mockResolvedValue({ locked: true, release: vi.fn() })
  supabaseSelect.mockResolvedValue([])
  supabaseInsert.mockResolvedValue(null)
  rpc.mockImplementation(async (name: string) => {
    if (name === "claim_manual_linkedin_publish") return { data: "claimed", error: null }
    if (name === "finalize_manual_linkedin_publish") return { data: true, error: null }
    return { data: null, error: null }
  })
  createServiceClient.mockReturnValue({ rpc })
  ensureFreshLinkedInPublishingAccount.mockResolvedValue({
    id: "acct-1",
    access_token: "tok",
    provider_account_id: "author-1",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  })
})

const postShare = async () => {
  const mod = await import("@/app/api/linkedin/share/route")
  const request = new NextRequest("http://localhost/api/linkedin/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Ready to publish", postId: "post-1" }),
  })
  return mod.POST(request)
}

describe("manual LinkedIn publish wiring", () => {
  it("claims, then finalizes, on a normal successful publish", async () => {
    shareToLinkedIn.mockResolvedValue({ shared: true, postUrn: "urn:li:share:123" })

    const res = await postShare()

    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith("claim_manual_linkedin_publish", expect.objectContaining({ p_post_id: "post-1" }))
    expect(rpc).toHaveBeenCalledWith("finalize_manual_linkedin_publish", expect.objectContaining({ p_post_id: "post-1" }))
    expect(rpc).not.toHaveBeenCalledWith("release_manual_linkedin_publish", expect.anything())
  })

  it("releases the claim when the LinkedIn API call throws before confirming", async () => {
    shareToLinkedIn.mockRejectedValue(new Error("linkedin_down"))

    const res = await postShare()

    expect(res.status).toBe(502)
    expect(rpc).toHaveBeenCalledWith("release_manual_linkedin_publish", {
      p_post_id: "post-1",
      p_workspace_id: "ws-1",
    })
  })

  it("does NOT release the claim once LinkedIn confirms the share, even if finalize keeps failing", async () => {
    shareToLinkedIn.mockResolvedValue({ shared: true, postUrn: "urn:li:share:123" })
    rpc.mockImplementation(async (name: string) => {
      if (name === "claim_manual_linkedin_publish") return { data: "claimed", error: null }
      if (name === "finalize_manual_linkedin_publish") return { data: false, error: null } // keeps failing
      return { data: null, error: null }
    })

    const res = await postShare()

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ shared: true, postUrn: "urn:li:share:123" })
    expect(rpc).not.toHaveBeenCalledWith("release_manual_linkedin_publish", expect.anything())
    // Falls back to marking the post published directly, so it isn't stuck mid-state.
    expect(postUpdate).toHaveBeenCalledWith("post-1", "ws-1", expect.objectContaining({ status: "published" }))
  })

  it("restores the original status during reconciliation", () => {
    expect(worker).toContain("manual_publish_previous_status")
    expect(worker).toContain("restoredStatus")
  })
})
