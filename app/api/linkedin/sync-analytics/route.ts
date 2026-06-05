import { NextResponse } from "next/server"
import { pollLinkedInAnalytics } from "@/lib/server/linkedin"
import { getAllLinkedInTokens } from "@/lib/server/linkedin-credentials"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

/**
 * Cron-triggered analytics sync.
 * Runs hourly via Vercel Cron (vercel.json) - no browser cookies available.
 * Instead of relying on a session cookie, queries all users with valid LinkedIn
 * tokens from the linkedin_credentials table, then polls analytics for each
 * user's published posts.
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret (Vercel injects this header for cron jobs)
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users with valid (non-expired) LinkedIn tokens from server-side storage
    const credentials = await getAllLinkedInTokens()
    if (credentials.length === 0) {
      return NextResponse.json({ message: "No connected LinkedIn accounts to poll", synced: false })
    }

    const allResults: Array<{ email: string; urn: string; status: string; stats?: unknown; message?: string }> = []

    for (const cred of credentials) {
      try {
        // Find the user's workspace and published posts with external URNs
        const workspaces = await supabaseSelect<{ id: string }>(
          "workspaces",
          `owner_email=eq.${encodeURIComponent(cred.owner_email)}&limit=1`
        )
        const workspaceId = workspaces?.[0]?.id
        if (!workspaceId) continue

        const posts = await supabaseSelect<{ id: string; external_urn: string }>(
          "posts",
          `workspace_id=eq.${workspaceId}&external_urn=not.is.null&status=eq.published&select=id,external_urn`
        )
        if (!posts || posts.length === 0) continue

        for (const post of posts) {
          if (!post.external_urn) continue
          try {
            const stats = await pollLinkedInAnalytics(cred.access_token, post.external_urn)
            await supabaseInsert("workspace_events", {
              workspace_key: cred.owner_email,
              event_type: "linkedin_analytics_polled",
              payload: { postUrn: post.external_urn, postId: post.id, ...stats },
              created_at: new Date().toISOString(),
            })
            allResults.push({ email: cred.owner_email, urn: post.external_urn, status: "success", stats })
          } catch (err) {
            allResults.push({ email: cred.owner_email, urn: post.external_urn, status: "error", message: (err as Error).message })
          }
        }
      } catch (err) {
        allResults.push({ email: cred.owner_email, urn: "workspace-level", status: "error", message: (err as Error).message })
      }
    }

    return NextResponse.json({ synced: true, usersPolled: credentials.length, results: allResults })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
