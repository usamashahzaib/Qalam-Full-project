import { NextResponse } from "next/server"
import { getAppSession } from "@/lib/server/app-session"
import { pollLinkedInAnalytics } from "@/lib/server/linkedin"
import { supabaseInsert } from "@/lib/server/supabase-rest"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = getAppSession(request as any)
    if (!session || !session.linkedinAccessToken) {
      return NextResponse.json({ error: "No active LinkedIn session to poll analytics" }, { status: 401 })
    }

    const { postUrns } = (await request.json()) as { postUrns: string[] }
    if (!Array.isArray(postUrns) || postUrns.length === 0) {
      return NextResponse.json({ error: "Missing postUrns array" }, { status: 400 })
    }

    const results = []
    for (const urn of postUrns) {
      try {
        const stats = await pollLinkedInAnalytics(session.linkedinAccessToken, urn)
        // Store the result as a workspace event so it feeds directly into the real analytics dashboard
        await supabaseInsert("workspace_events", {
          workspace_key: session.email,
          event_type: "linkedin_analytics_polled",
          payload: { postUrn: urn, ...stats },
          created_at: new Date().toISOString(),
        })
        results.push({ urn, stats, status: "success" })
      } catch (err) {
        results.push({ urn, status: "error", message: (err as Error).message })
      }
    }

    return NextResponse.json({ synced: true, results })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
