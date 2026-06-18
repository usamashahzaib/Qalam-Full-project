// Vercel Cron: every 5 minutes — see vercel.json
// Finds posts due for manual-publish notification. Skips workspaces with a
// connected LinkedIn account (auto-publish cron handles those).
export const maxDuration = 30

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { env } from "@/lib/server/env"

type DuePost = {
  id: string
  title: string
  content: string
  scheduled_for: string
  workspace_id: string
  user_id: string
  // Supabase returns array for FK joins; we always take index 0
  users: { email: string; full_name: string }[] | null
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!env.cronSecret || authHeader !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find posts that are due and haven't been notified yet
  const { data: duePosts, error } = await supabase
    .from("posts")
    .select(`
      id, title, content, scheduled_for, workspace_id, user_id,
      users:user_id ( email, full_name )
    `)
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(50)

  if (error) {
    console.error("[cron/schedule] query error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!duePosts?.length) {
    return NextResponse.json({ notified: 0, autoPublishSkipped: 0 })
  }

  // Find workspaces that have a connected LinkedIn publishing account.
  // These are handled by the auto-publish cron (/api/linkedin/publish-scheduled)
  // so we must NOT send a "please post manually" reminder for them.
  const uniqueWorkspaceIds = [...new Set((duePosts as unknown as DuePost[]).map(p => p.workspace_id))]
  const { data: connectedAccounts } = await supabase
    .from("publishing_accounts")
    .select("workspace_id")
    .eq("provider", "linkedin")
    .gt("expires_at", new Date().toISOString())
    .in("workspace_id", uniqueWorkspaceIds)

  const autoPublishWorkspaces = new Set((connectedAccounts || []).map((a: { workspace_id: string }) => a.workspace_id))

  let notified = 0
  let autoPublishSkipped = 0
  const now = new Date().toISOString()

  for (const post of duePosts as unknown as DuePost[]) {
    // Skip workspaces that have auto-publish configured — their cron handles publishing
    if (autoPublishWorkspaces.has(post.workspace_id)) {
      autoPublishSkipped++
      continue
    }

    const email = Array.isArray(post.users) ? post.users[0]?.email : (post.users as { email?: string } | null)?.email
    if (!email) continue

    const authorName = (Array.isArray(post.users) ? post.users[0]?.full_name : (post.users as { full_name?: string } | null)?.full_name) || "there"
    const scheduledAt = new Date(post.scheduled_for).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

    const contentPreview = (post.content || "").slice(0, 300)

    // Send reminder to post manually (LinkedIn not connected for this workspace)
    await sendTransactionalEmail({
      to: email,
      subject: `Reminder: "${post.title}" is ready to post`,
      text: [
        `Hi ${authorName},`,
        ``,
        `Your post "${post.title}" was scheduled for ${scheduledAt}.`,
        ``,
        `To publish it, open Qalam and share it to LinkedIn manually — your LinkedIn account`,
        `is not connected to Qalam for auto-publishing.`,
        ``,
        `Here's a preview of your content:`,
        ``,
        contentPreview + ((post.content?.length ?? 0) > 300 ? "..." : ""),
        ``,
        `Open Qalam to copy and publish: https://byqalam.com/dashboard`,
        ``,
        `To enable auto-publishing in future, connect your LinkedIn account in Settings.`,
        ``,
        `— The Qalam team`,
      ].join("\n"),
    }).catch((err) => console.error(`[cron/schedule] email failed for post ${post.id}:`, err))

    // Mark as notified
    await supabase
      .from("posts")
      .update({ status: "notified", updated_at: now })
      .eq("id", post.id)

    // Log the notification (best-effort)
    supabase.from("scheduling_notifications").insert({
      post_id: post.id,
      user_id: post.user_id,
      email,
      notified_at: now,
    }).then(undefined, () => undefined)

    notified++
  }

  return NextResponse.json({ notified, autoPublishSkipped })
}
