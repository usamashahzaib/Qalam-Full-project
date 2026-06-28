import { NextResponse } from "next/server"
import { shareToLinkedIn, LinkedInApiError, LINKEDIN_MAX_POST_CHARS } from "@/lib/server/linkedin"
import { getLinkedInPublishingAccount } from "@/lib/server/linkedin-credentials"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getRedis } from "@/lib/server/redis"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

export const maxDuration = 60

type ScheduledPost = {
  id: string
  workspace_id: string
  user_id: string
  title: string | null
  content: string | null
  status: string
  scheduled_for: string | null
  metadata?: Record<string, unknown> | null
}

type UserRow = { id: string; email: string | null; full_name: string | null }
type LockHandle = { locked: boolean; release: () => Promise<void> }

const markPost = async (post: ScheduledPost, patch: Record<string, unknown>) =>
  supabasePatch("posts", `id=eq.${post.id}`, { ...patch, updated_at: new Date().toISOString() })

const markFailed = async (post: ScheduledPost, reason: string) =>
  markPost(post, { status: "failed", metadata: { ...(post.metadata || {}), last_publish_error: reason } })

const logPublish = async (postId: string, accountId: string | null, status: "success" | "failed", error: string | null, providerResponse: Record<string, unknown> | null) =>
  supabaseInsert(
    "publish_logs",
    {
      post_id: postId,
      account_id: accountId,
      status,
      error_message: error,
      provider_response: providerResponse,
    },
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
        : `Open Qalam to review the failed post.`,
      ``,
      `Post: ${post.title || "Untitled post"}`,
      ``,
      `- The Qalam team`,
    ].join("\n"),
  }).catch((error) => console.error("[linkedin/publish-scheduled] email failed:", error))
}

const errorReason = (error: unknown) => {
  if (error instanceof LinkedInApiError && error.status === 401) return "linkedin_token_invalid"
  return (error as Error).message || "linkedin_publish_failed"
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const duePosts = await supabaseSelect<ScheduledPost>(
      "posts",
      `status=eq.scheduled&scheduled_for=not.is.null&scheduled_for=lte.${encodeURIComponent(new Date().toISOString())}&select=id,workspace_id,user_id,title,content,status,scheduled_for,metadata&order=scheduled_for.asc&limit=50`
    )

    if (!duePosts?.length) {
      return NextResponse.json({ processed: 0, published: 0, failed: 0, skipped: 0, results: [] })
    }

    const uniqueWorkspaceIds = [...new Set(duePosts.map(p => p.workspace_id))]
    const uniqueUserIds = [...new Set(duePosts.map(p => p.user_id).filter(Boolean))]
    const [accountEntries, users] = await Promise.all([
      Promise.all(uniqueWorkspaceIds.map(async (wsId) => [wsId, await getLinkedInPublishingAccount(wsId)] as const)),
      uniqueUserIds.length
        ? supabaseSelect<UserRow>("users", `id=in.(${uniqueUserIds.map(encodeURIComponent).join(",")})&select=id,email,full_name`).catch(() => [])
        : Promise.resolve([]),
    ])

    const accountsByWorkspace = new Map(accountEntries.filter(([, acct]) => acct !== null))
    const usersById = new Map((users || []).map(user => [user.id, user]))
    const results: Array<{ postId: string; status: "published" | "failed" | "skipped"; reason?: string; postUrn?: string | null }> = []
    const redis = getRedis()

    for (const post of duePosts) {
      const lock = await acquirePublishLock(post.id)
      if (!lock.locked) {
        results.push({ postId: post.id, status: "skipped", reason: "publish_lock_active" })
        continue
      }

      try {
        // PLAN GATE: verify user still has scheduling + publish rights
        const { getPlanStatus } = await import("@/lib/server/plan-limits-v2")
        const { PLAN_LIMITS } = await import("@/lib/entitlements")
        const status = await getPlanStatus(post.user_id)
        const limits = PLAN_LIMITS[status.plan as keyof typeof PLAN_LIMITS]
        if (!limits?.scheduling || !limits?.linkedinPublish) {
          await markFailed(post, "plan_downgraded")
          results.push({ postId: post.id, status: "failed", reason: "plan_downgraded" })
          continue
        }

        // Per-account rate limit: max 1 publish per 15 minutes per workspace
        const rateKey = `rate:linkedin:${post.workspace_id}`
        const lastPublish = await redis?.get<string>(rateKey)
        if (lastPublish && Date.now() - Number(lastPublish) < 15 * 60 * 1000) {
          results.push({ postId: post.id, status: "skipped", reason: "account_publish_cooldown" })
          continue
        }

        const content = post.content?.trim()
        const account = accountsByWorkspace.get(post.workspace_id) ?? null
        const user = usersById.get(post.user_id)

        if (!content) {
          await markFailed(post, "scheduled_post_missing_content")
          await logPublish(post.id, account?.id || null, "failed", "scheduled_post_missing_content", null)
          results.push({ postId: post.id, status: "failed", reason: "scheduled_post_missing_content" })
          continue
        }

        if (content.length > LINKEDIN_MAX_POST_CHARS) {
          await markFailed(post, "linkedin_content_too_long")
          await logPublish(post.id, account?.id || null, "failed", "linkedin_content_too_long", null)
          await notifyPublishFailure(post, user, "linkedin_content_too_long")
          results.push({ postId: post.id, status: "failed", reason: "linkedin_content_too_long" })
          continue
        }

        if (!account?.access_token || !account.provider_account_id) {
          await markFailed(post, "linkedin_auth_required")
          await logPublish(post.id, account?.id || null, "failed", "linkedin_auth_required", null)
          await notifyPublishFailure(post, user, "linkedin_auth_required")
          results.push({ postId: post.id, status: "failed", reason: "linkedin_auth_required" })
          continue
        }

        if (account.expires_at && Date.parse(account.expires_at) < Date.now()) {
          await markFailed(post, "linkedin_token_expired")
          await logPublish(post.id, account.id, "failed", "linkedin_token_expired", null)
          await notifyPublishFailure(post, user, "linkedin_token_expired")
          results.push({ postId: post.id, status: "failed", reason: "linkedin_token_expired" })
          continue
        }

        try {
          const shared = await shareToLinkedIn({
            accessToken: account.access_token,
            authorId: account.provider_account_id,
            content,
          })

          await markPost(post, {
            status: "published",
            published_at: new Date().toISOString(),
            linkedin_post_id: shared.postUrn,
            metadata: { ...(post.metadata || {}), last_publish_error: null },
          })
          await logPublish(post.id, account.id, "success", null, { postUrn: shared.postUrn })
          await redis?.set(rateKey, String(Date.now()), { ex: 900 })
          results.push({ postId: post.id, status: "published", postUrn: shared.postUrn })
        } catch (error) {
          const reason = errorReason(error)
          await markFailed(post, reason)
          await logPublish(post.id, account.id, "failed", reason, null)
          if (reason === "linkedin_token_invalid") await notifyPublishFailure(post, user, reason)
          results.push({ postId: post.id, status: "failed", reason })
        }
      } finally {
        await lock.release()
      }
    }

    return NextResponse.json({
      processed: duePosts.length,
      published: results.filter(result => result.status === "published").length,
      failed: results.filter(result => result.status === "failed").length,
      skipped: results.filter(result => result.status === "skipped").length,
      results,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "scheduled_publish_failed" }, { status: 500 })
  }
}
