import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ select: vi.fn(), patch: vi.fn(), share: vi.fn(), lock: vi.fn(), release: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ supabaseSelect: mocks.select, supabasePatch: mocks.patch, supabaseInsert: vi.fn().mockResolvedValue([]) }))
vi.mock("@/lib/server/linkedin", () => ({ shareToLinkedIn: mocks.share, LinkedInApiError: class extends Error {}, LINKEDIN_MAX_POST_CHARS: 3000 }))
vi.mock("@/lib/server/linkedin-publish-lock", () => ({ acquireLinkedInPublishLock: mocks.lock }))
vi.mock("@/lib/server/linkedin-credentials", () => ({ ensureFreshLinkedInPublishingAccount: vi.fn().mockResolvedValue({ id: "account", access_token: "test", provider_account_id: "author" }) }))
vi.mock("@/lib/server/email", () => ({ sendTransactionalEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/server/notifications", () => ({ createNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/server/plan-limits-v2", () => ({ getPlanStatus: vi.fn().mockResolvedValue({ plan: "Pro" }) }))
vi.mock("@/lib/server/env", () => ({ supportEnv: { email: "test@example.invalid" } }))
vi.mock("@/lib/server/logging", () => ({ log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
import { publishScheduledPost, reconcileStuckPublishing } from "@/lib/server/linkedin-publish"

const post = { id: "post", workspace_id: "workspace", user_id: "user", title: "Draft", content: "Original", status: "scheduled", scheduled_for: "2020-01-01T12:00:00Z", engagement_score: 90, metadata: { type: "linkedin" } }

describe("scheduled publishing safety", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.select.mockReset()
    mocks.patch.mockReset()
    mocks.lock.mockResolvedValue({ locked: true, release: mocks.release })
    mocks.release.mockResolvedValue(undefined)
    mocks.share.mockResolvedValue({ postUrn: "urn:li:share:test" })
  })
  it("ignores a stale delivery after a post was moved to a future date", async () => {
    mocks.select.mockResolvedValue([{ ...post, scheduled_for: "2099-01-01T12:00:00Z" }])
    expect(await publishScheduledPost("post")).toMatchObject({ status: "skipped", reason: "not_due" })
    expect(mocks.patch).not.toHaveBeenCalled()
    expect(mocks.share).not.toHaveBeenCalled()
  })
  it("makes the due-time check part of the atomic claim", async () => {
    mocks.select.mockResolvedValue([post])
    mocks.patch.mockResolvedValue([])
    expect(await publishScheduledPost("post")).toMatchObject({ reason: "already_claimed" })
    expect(mocks.patch.mock.calls[0][1]).toContain("scheduled_for=lte.")
    expect(mocks.share).not.toHaveBeenCalled()
  })
  it("publishes the content actually claimed rather than an earlier snapshot", async () => {
    mocks.select.mockResolvedValueOnce([post]).mockResolvedValue([])
    mocks.patch.mockResolvedValueOnce([{ ...post, content: "Latest approved content", status: "publishing" }]).mockResolvedValue([post])
    expect(await publishScheduledPost("post")).toMatchObject({ status: "published" })
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({ content: "Latest approved content" }))
  })
  it("does not auto-retry an uncertain external publish when the log lookup fails", async () => {
    mocks.select.mockResolvedValueOnce([{ ...post, status: "publishing" }]).mockRejectedValueOnce(new Error("database unavailable"))
    expect(await reconcileStuckPublishing()).toEqual({ finalized: 0, reverted: 0, needsReview: 1 })
    expect(mocks.patch).not.toHaveBeenCalled()
    expect(mocks.share).not.toHaveBeenCalled()
  })
  it("does not count a failed reconciliation write as finalized", async () => {
    mocks.select.mockResolvedValueOnce([post]).mockResolvedValueOnce([{ provider_response: { postUrn: "urn:test" } }])
    mocks.patch.mockRejectedValue(new Error("database unavailable"))
    expect(await reconcileStuckPublishing()).toEqual({ finalized: 0, reverted: 0, needsReview: 1 })
  })
})
