import { NextResponse } from "next/server"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import { publishScheduledPost, reconcileStuckPublishing, type ScheduledPost } from "@/lib/server/linkedin-publish"
import { verifyCronAuth } from "@/lib/server/verify-cron"

export const maxDuration = 60

/**
 * Daily safety-net sweep, not the primary publish path. Real-time publishing
 * happens via QStash delivering to /api/linkedin/publish-scheduled/webhook at
 * each post's exact scheduled time (see lib/server/qstash.ts). This cron only
 * catches:
 *   - posts whose QStash delivery never arrived (message lost, or QStash was
 *     unreachable at schedule time)
 *   - posts stuck in "publishing" because a prior run died mid-publish
 * Batch size is capped and per-post work is cheap (single shared claim +
 * publish call), so this comfortably fits the 60s budget even on a bad day -
 * unlike the old design, this is not expected to process a full day's volume
 * in one run since QStash already handles that in real time.
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const reconciled = await reconcileStuckPublishing()

    const duePosts = await supabaseSelect<ScheduledPost>(
      "posts",
      `status=eq.scheduled&scheduled_for=not.is.null&scheduled_for=lte.${encodeURIComponent(new Date().toISOString())}&select=id&order=scheduled_for.asc&limit=20`
    )

    const results = duePosts?.length
      ? await Promise.all(duePosts.map((post) => publishScheduledPost(post.id)))
      : []

    return NextResponse.json({
      reconciled,
      processed: results.length,
      published: results.filter((r) => r.status === "published").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "scheduled_publish_failed" }, { status: 500 })
  }
}
