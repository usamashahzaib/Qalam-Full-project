import { NextResponse } from "next/server"
import { shareToLinkedIn } from "@/lib/server/linkedin"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

type ScheduledPost = {
  id: string
  workspace_id: string
  content: string | null
  status: string
  scheduled_time: string | null
}

type PublishingAccount = {
  id: string
  workspace_id: string
  provider_account_id: string | null
  access_token: string | null
  expires_at: string | null
}

const markPost = async (postId: string, patch: Record<string, unknown>) =>
  supabasePatch("posts", `id=eq.${postId}`, { ...patch, updated_at: new Date().toISOString() })

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

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const duePosts = await supabaseSelect<ScheduledPost>(
      "posts",
      `status=eq.scheduled&scheduled_time=not.is.null&scheduled_time=lte.${encodeURIComponent(new Date().toISOString())}&select=id,workspace_id,content,status,scheduled_time&order=scheduled_time.asc&limit=50`
    )

    if (!duePosts?.length) {
      return NextResponse.json({ processed: 0, published: 0, failed: 0, results: [] })
    }

    const accountRows = await supabaseSelect<PublishingAccount>(
      "publishing_accounts",
      `provider=eq.linkedin&workspace_id=in.(${duePosts.map(post => post.workspace_id).join(",")})&select=id,workspace_id,provider_account_id,access_token,expires_at`
    )
    const accountsByWorkspace = new Map((accountRows || []).map(account => [account.workspace_id, account]))
    const results: Array<{ postId: string; status: "published" | "failed"; reason?: string; postUrn?: string | null }> = []

    for (const post of duePosts) {
      const content = post.content?.trim()
      const account = accountsByWorkspace.get(post.workspace_id)

      if (!content) {
        await markPost(post.id, { status: "failed" })
        await logPublish(post.id, account?.id || null, "failed", "scheduled_post_missing_content", null)
        results.push({ postId: post.id, status: "failed", reason: "scheduled_post_missing_content" })
        continue
      }

      if (!account?.access_token || !account.provider_account_id) {
        await markPost(post.id, { status: "failed" })
        await logPublish(post.id, account?.id || null, "failed", "linkedin_auth_required", null)
        results.push({ postId: post.id, status: "failed", reason: "linkedin_auth_required" })
        continue
      }

      if (account.expires_at && Date.parse(account.expires_at) < Date.now()) {
        await markPost(post.id, { status: "failed" })
        await logPublish(post.id, account.id, "failed", "linkedin_token_expired", null)
        results.push({ postId: post.id, status: "failed", reason: "linkedin_token_expired" })
        continue
      }

      try {
        const shared = await shareToLinkedIn({
          accessToken: account.access_token,
          authorId: account.provider_account_id,
          content,
        })

        await markPost(post.id, {
          status: "published",
          published_at: new Date().toISOString(),
          external_post_urn: shared.postUrn,
        })
        await logPublish(post.id, account.id, "success", null, { postUrn: shared.postUrn })
        results.push({ postId: post.id, status: "published", postUrn: shared.postUrn })
      } catch (error) {
        const message = (error as Error).message || "linkedin_publish_failed"
        await markPost(post.id, { status: "failed" })
        await logPublish(post.id, account.id, "failed", message, null)
        results.push({ postId: post.id, status: "failed", reason: message })
      }
    }

    return NextResponse.json({
      processed: duePosts.length,
      published: results.filter(result => result.status === "published").length,
      failed: results.filter(result => result.status === "failed").length,
      results,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "scheduled_publish_failed" }, { status: 500 })
  }
}
