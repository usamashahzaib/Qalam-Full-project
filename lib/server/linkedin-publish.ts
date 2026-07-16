import "server-only"

import { shareToLinkedIn, LinkedInApiError, LINKEDIN_MAX_POST_CHARS } from "@/lib/server/linkedin"
import { ensureFreshLinkedInPublishingAccount } from "@/lib/server/linkedin-credentials"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getRedis } from "@/lib/server/redis"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"
import { supportEnv } from "@/lib/server/env"
import { isCarouselPostType } from "@/lib/post-content"

export type ScheduledPost = {
  id: string
  workspace_id: string
  user_id: string
  title: string | null
  content: string | null
  type: string | null
  status: string
  scheduled_for: string | null
  metadata?: Record<string, unknown> | null
}

type UserRow = { id: string; email: string | null; full_name: string | null }
type LockHandle = { locked: boolean; release: () => Promise<void> }

export type PublishOutcome = { postId: string; status: "published" | "failed" | "skipped"; reason?: string; postUrn?: string | null }

const markPost = async (post: ScheduledPost, patch: Record<string, unknown>) =>
  supabasePatch("posts", `id=eq.${post.id}`, { ...patch, updated_at: new Date().toISOString() })

const markFailed = async (post: ScheduledPost, reason: string) =>
  markPost(post, { status: "failed", metadata: { ...(post.metadata || {}), last_publish_error: reason } })

const logPublish = async (postId: string, accountId: string | null, status: "success" | "failed", error: string | null, providerResponse: Record<string, unknown> | null) =>
  supabaseInsert(
    "publish_logs",
    { post_id: postId, account_id: accountId, status, error_message: error, provider_response: providerResponse },
    "return=minimal"
  ).catch(() => undefined)

const acquirePublishLock = async (postId: string): Promise<LockHandle> => {
  const redis = getRedis()
  if (!redis) return { locked: true, release: async () => undefined }
  const key = `lock:linkedin:publish:${postId}`
  const token = crypto.randomUUID()
  const locked = await redis.set(key, token, { nx: true, ex: 300 })
  return {
    locked: locked === "OK",
    release: async () => {
      if (await redis.get<string>(key) === token) await redis.del(key)
    },
  }
}

const notifyPublishFailure = async (post: ScheduledPost, user: UserRow | undefined, reason: string) => {
  if (!user?.email) return
  await sendTransactionalEmail({
    to: user.email,
    subject: `Qalam could not publish "${post.title || "your scheduled post"}"`,
    text: [
      `Hi ${user.full_name || "there"},`,
      ``,
      `Qalam could not publish your scheduled LinkedIn post.`,
      ``,
      `Reason: ${reason}`,
      ``,
      reason === "linkedin_token_expired" || reason === "linkedin_token_invalid"
        ? `Reconnect LinkedIn in Settings, then reschedule or publish the post again.`
        : reason === "carousel_scheduling_unsupported"
        ? `Carousel posts can't be auto-published yet. Export the PDF from Carousels and post it manually on LinkedIn.`
        : `Open Qalam to review the failed post.`,
      ``,
      `Post: ${post.title || "Untitled post"}`,
      ``,
      `- The Qalam team`,
    ].join("\n"),
  }).catch((error) => console.error("[linkedin-publish] email failed:", error))
}

const errorReason = (error: unknown) => {
  if (error instanceof LinkedInApiError && error.status === 401) return "linkedin_token_invalid"
  return (error as Error).message || "linkedin_publish_failed"
}

const alertOps = async (subject: string, detail: Record<string, unknown>) => {
  log.error(subject, detail)
  await sendTransactionalEmail({
    to: supportEnv.email,
    subject: `[ALERT] ${subject}`,
    text: JSON.stringify(detail, null, 2),
  }).catch(() => undefined)
}

/**
 * Publish a single due post. Called from both the QStash webhook (primary,
 * near-exact-time path) and the daily safety-net cron sweep - identical
 * logic either way, so behaviour never diverges between the two triggers.
 *
 * State machine: scheduled -> publishing -> published | failed. The
 * scheduled->publishing transition is a conditional UPDATE (only succeeds if
 * the row is still "scheduled"), which is the real concurrency guard: if the
 * QStash webhook and the safety-net cron race for the same post, only one
 * wins the transition and the other sees zero rows patched and skips.
 *
 * Once shareToLinkedIn succeeds, the post is never flipped back to "failed" -
 * the content is now live on LinkedIn, and showing "failed" would invite a
 * duplicate re-publish. If the follow-up DB write to mark it "published"
 * fails after retries, we leave it in "publishing" and page ops instead of
 * lying to the user.
 */
export async function publishScheduledPost(postId: string): Promise<PublishOutcome> {
  const rows = await supabaseSelect<ScheduledPost>(
    "posts",
    `id=eq.${postId}&select=id,workspace_id,user_id,title,content,type,status,scheduled_for,metadata&limit=1`
  )
  const post = rows?.[0]
  if (!post) return { postId, status: "skipped", reason: "post_not_found" }
  if (post.status !== "scheduled") return { postId, status: "skipped", reason: `not_scheduled:${post.status}` }

  const lock = await acquirePublishLock(postId)
  if (!lock.locked) return { postId, status: "skipped", reason: "publish_lock_active" }

  try {
    // Conditional transition - only succeeds while the row is still "scheduled".
    const claimed = await supabasePatch<ScheduledPost>(
      "posts",
      `id=eq.${postId}&status=eq.scheduled`,
      { status: "publishing", updated_at: new Date().toISOString() }
    )
    if (!claimed?.length) return { postId, status: "skipped", reason: "already_claimed" }

    try {
      const { getPlanStatus } = await import("@/lib/server/plan-limits-v2")
      const { PLAN_LIMITS } = await import("@/lib/entitlements")
      const status = await getPlanStatus(post.user_id)
      const limits = PLAN_LIMITS[status.plan as keyof typeof PLAN_LIMITS]
      if (!limits?.scheduling || !limits?.linkedinPublish) {
        await markFailed(post, "plan_downgraded")
        return { postId, status: "failed", reason: "plan_downgraded" }
      }

      const content = post.content?.trim()
      const [account, userRows] = await Promise.all([
        ensureFreshLinkedInPublishingAccount(post.workspace_id),
        supabaseSelect<UserRow>("users", `id=eq.${post.user_id}&select=id,email,full_name&limit=1`).catch(() => []),
      ])
      const user = userRows?.[0]

      if (!content) {
        await markFailed(post, "scheduled_post_missing_content")
        await logPublish(post.id, account?.id || null, "failed", "scheduled_post_missing_content", null)
        return { postId, status: "failed", reason: "scheduled_post_missing_content" }
      }

      if (isCarouselPostType(post.type)) {
        await markFailed(post, "carousel_scheduling_unsupported")
        await logPublish(post.id, account?.id || null, "failed", "carousel_scheduling_unsupported", null)
        await notifyPublishFailure(post, user, "carousel_scheduling_unsupported")
        return { postId, status: "failed", reason: "carousel_scheduling_unsupported" }
      }

      if (content.length > LINKEDIN_MAX_POST_CHARS) {
        await markFailed(post, "linkedin_content_too_long")
        await logPublish(post.id, account?.id || null, "failed", "linkedin_content_too_long", null)
        await notifyPublishFailure(post, user, "linkedin_content_too_long")
        return { postId, status: "failed", reason: "linkedin_content_too_long" }
      }

      if (!account?.access_token || !account.provider_account_id) {
        await markFailed(post, "linkedin_auth_required")
        await logPublish(post.id, account?.id || null, "failed", "linkedin_auth_required", null)
        await notifyPublishFailure(post, user, "linkedin_auth_required")
        return { postId, status: "failed", reason: "linkedin_auth_required" }
      }

      if (account.expires_at && Date.parse(account.expires_at) < Date.now()) {
        await markFailed(post, "linkedin_token_expired")
        await logPublish(post.id, account.id, "failed", "linkedin_token_expired", null)
        await notifyPublishFailure(post, user, "linkedin_token_expired")
        return { postId, status: "failed", reason: "linkedin_token_expired" }
      }

      let shared: { postUrn: string | null }
      try {
        shared = await shareToLinkedIn({
          accessToken: account.access_token,
          authorId: account.provider_account_id,
          content,
          userId: post.user_id,
          workspaceId: post.workspace_id,
        })
      } catch (error) {
        const reason = errorReason(error)
        await markFailed(post, reason)
        await logPublish(post.id, account.id, "failed", reason, null)
        if (reason === "linkedin_token_invalid") await notifyPublishFailure(post, user, reason)
        return { postId, status: "failed", reason }
      }

      // LinkedIn share succeeded - the post is now live. Record that durably
      // before anything else, then retry the "published" write; never mark
      // this post "failed" past this point.
      await logPublish(post.id, account.id, "success", null, { postUrn: shared.postUrn })

      const MARK_PUBLISHED_ATTEMPTS = 3
      for (let attempt = 0; attempt < MARK_PUBLISHED_ATTEMPTS; attempt++) {
        try {
          await markPost(post, {
            status: "published",
            published_at: new Date().toISOString(),
            linkedin_post_id: shared.postUrn,
            metadata: { ...(post.metadata || {}), last_publish_error: null },
          })
          return { postId, status: "published", postUrn: shared.postUrn }
        } catch (err) {
          if (attempt === MARK_PUBLISHED_ATTEMPTS - 1) {
            await alertOps("linkedin_publish.mark_published_failed", {
              postId: post.id,
              postUrn: shared.postUrn,
              error: (err as Error).message,
            })
            // Leave status as "publishing" - it is live on LinkedIn, publish_logs
            // has the URN, and this must never be retried as if unpublished.
            return { postId, status: "published", postUrn: shared.postUrn }
          }
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
        }
      }
      return { postId, status: "published", postUrn: shared.postUrn }
    } catch (error) {
      const reason = errorReason(error)
      await markFailed(post, reason).catch(() => undefined)
      return { postId, status: "failed", reason }
    }
  } finally {
    await lock.release()
  }
}

/**
 * Reconciliation pass for the daily safety-net cron: posts stuck in
 * "publishing" for too long (the process died between the LinkedIn share and
 * the DB write, or between claiming the row and calling LinkedIn). Checks
 * publish_logs for a recorded success and finalizes to "published"; otherwise
 * reverts to "scheduled" so the next sweep retries it.
 */
export async function reconcileStuckPublishing(olderThanMs = 10 * 60 * 1000): Promise<{ finalized: number; reverted: number }> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString()
  const stuck = await supabaseSelect<ScheduledPost>(
    "posts",
    `status=eq.publishing&updated_at=lt.${encodeURIComponent(cutoff)}&select=id,workspace_id,user_id,title,content,status,scheduled_for,metadata&limit=50`
  )
  if (!stuck?.length) return { finalized: 0, reverted: 0 }

  let finalized = 0
  let reverted = 0
  for (const post of stuck) {
    const logs = await supabaseSelect<{ post_id: string; status: string; provider_response: { postUrn?: string } | null }>(
      "publish_logs",
      `post_id=eq.${post.id}&status=eq.success&select=post_id,status,provider_response&order=created_at.desc&limit=1`
    ).catch(() => [])
    const successLog = logs?.[0]
    if (successLog) {
      await markPost(post, {
        status: "published",
        published_at: new Date().toISOString(),
        linkedin_post_id: successLog.provider_response?.postUrn || null,
      }).catch(() => undefined)
      finalized++
    } else {
      await supabasePatch("posts", `id=eq.${post.id}&status=eq.publishing`, {
        status: "scheduled",
        updated_at: new Date().toISOString(),
      }).catch(() => undefined)
      reverted++
    }
  }
  return { finalized, reverted }
}
