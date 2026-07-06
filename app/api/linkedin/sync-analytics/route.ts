import { NextResponse } from "next/server"
import { pollLinkedInAnalytics } from "@/lib/server/linkedin"
import { ensureFreshLinkedInToken, getAllLinkedInTokens } from "@/lib/server/linkedin-credentials"
import { supabaseInsert, supabaseSelect, createServiceClient } from "@/lib/server/supabase-rest"

const CONCURRENCY = 3

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
    if (i + concurrency < items.length) {
      // Jitter: 200-600ms between batches to avoid thundering herd
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400))
    }
  }
  return results
}

/**
 * Cron-triggered analytics sync.
 * Runs hourly via Vercel Cron (vercel.json) - no browser cookies available.
 * Instead of relying on a session cookie, queries all users with valid LinkedIn
 * tokens from the linkedin_credentials table, then polls analytics for each
 * user's published posts.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel injects this header for cron jobs).
    // Guard against an unset CRON_SECRET - otherwise "Bearer undefined" would pass.
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // Get all users with valid (non-expired) LinkedIn tokens from server-side storage
    const credentials = await getAllLinkedInTokens()
    if (credentials.length === 0) {
      return NextResponse.json({ message: "No connected LinkedIn accounts to poll", synced: false })
    }

    const allResults: Array<{ email: string; urn: string; status: string; stats?: unknown; message?: string }> = []

    const credResults = await processBatch(credentials, async (cred) => {
      const credResultsInner: typeof allResults = []
      try {
        // Find the user's workspace by owner_id (internal UUID or external OAuth sub)
        const workspaces = await supabaseSelect<{ id: string; key: string }>(
          "workspaces",
          `owner_id=eq.${encodeURIComponent(cred.user_id)}&limit=1&select=id,key`
        )
        const workspace = workspaces?.[0]
        if (!workspace) return credResultsInner

        // BUG #14 fix: column is external_post_urn, not external_urn
        const posts = await supabaseSelect<{ id: string; external_post_urn: string; user_id: string }>(
          "posts",
          `workspace_id=eq.${workspace.id}&external_post_urn=not.is.null&status=eq.published&select=id,external_post_urn,user_id`
        )
        if (!posts || posts.length === 0) return credResultsInner

        const supabase = createServiceClient()
        const todayStart = new Date()
        todayStart.setUTCHours(0, 0, 0, 0)

        const fresh = await ensureFreshLinkedInToken(cred.user_id)
        const accessToken = fresh?.access_token || cred.access_token

        for (const post of posts) {
          if (!post.external_post_urn) continue
          try {
            const stats = await pollLinkedInAnalytics(accessToken, post.external_post_urn, cred.user_id)

            // Write event log (existing behaviour)
            await supabaseInsert("workspace_events", {
              workspace_key: workspace.key,
              event_type: "linkedin_analytics_polled",
              payload: { postUrn: post.external_post_urn, postId: post.id, ...stats },
              created_at: new Date().toISOString(),
            })

            // Also write to analytics_snapshots so the analytics UI shows auto-synced data.
            // One snapshot per post per day - update if already exists today, insert otherwise.
            const { data: existing } = await supabase
              .from("analytics_snapshots")
              .select("id")
              .eq("post_id", post.id)
              .eq("workspace_id", workspace.id)
              .gte("captured_at", todayStart.toISOString())
              .limit(1)
              .maybeSingle()

            // Persist the real engagement metrics returned by LinkedIn instead of
            // hardcoded zeros. Columns may be NOT NULL, so fall back to 0 only when
            // the API genuinely returns no value.
            if (!existing) {
              await supabase
                .from("analytics_snapshots")
                .insert({
                  post_id: post.id,
                  workspace_id: workspace.id,
                  user_id: post.user_id,
                  impressions: stats.impressions,
                  reactions: stats.reactions ?? 0,
                  comments: stats.comments ?? 0,
                  reposts: stats.reposts ?? 0,
                  follower_delta: 0,
                  notes: "Auto-synced from LinkedIn",
                  captured_at: new Date().toISOString(),
                })
                .then(undefined, (e: unknown) => console.error("[sync-analytics] snapshot insert failed:", e))
            } else {
              await supabase
                .from("analytics_snapshots")
                .update({
                  impressions: stats.impressions,
                  reactions: stats.reactions ?? 0,
                  comments: stats.comments ?? 0,
                  reposts: stats.reposts ?? 0,
                  captured_at: new Date().toISOString(),
                })
                .eq("id", existing.id)
                .then(undefined, (e: unknown) => console.error("[sync-analytics] snapshot update failed:", e))
            }

            credResultsInner.push({ email: cred.user_id, urn: post.external_post_urn, status: "success", stats })
          } catch (err) {
            credResultsInner.push({ email: cred.user_id, urn: post.external_post_urn, status: "error", message: (err as Error).message })
          }
        }
      } catch (err) {
        credResultsInner.push({ email: cred.user_id, urn: "workspace-level", status: "error", message: (err as Error).message })
      }
      return credResultsInner
    }, CONCURRENCY)

    for (const batch of credResults) allResults.push(...batch)

    return NextResponse.json({ synced: true, usersPolled: credentials.length, results: allResults })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
