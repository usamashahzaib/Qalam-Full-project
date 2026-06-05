import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"

type PostCount = { status: string; count: string }
type RecentEvent = { event_type: string; recorded_at: string }
type RecentJob = { type: string; status: string; created_at: string }
type ApprovalPending = { id: string }

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)

    // Run all DB queries in parallel
    const [postRows, eventRows, jobRows, approvalRows] = await Promise.all([
      // Post counts by status
      supabaseSelect<PostCount>(
        "posts",
        `workspace_id=eq.${workspaceId}&select=status`
      ),
      // Recent events (last 30 days)
      supabaseSelect<RecentEvent>(
        "analytics_events",
        `workspace_id=eq.${workspaceId}&order=recorded_at.desc&limit=50&select=event_type,recorded_at`
      ),
      // Recent jobs (last 10)
      supabaseSelect<RecentJob>(
        "jobs",
        `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=10&select=type,status,created_at`
      ),
      // Pending approvals count
      supabaseSelect<ApprovalPending>(
        "posts",
        `workspace_id=eq.${workspaceId}&status=eq.pending_approval&select=id`
      ),
    ])

    // Aggregate post counts
    const postsByStatus: Record<string, number> = {}
    for (const row of (postRows || [])) {
      postsByStatus[row.status] = (postsByStatus[row.status] || 0) + 1
    }

    const stats = {
      posts: {
        total: postRows?.length || 0,
        draft: postsByStatus["draft"] || 0,
        scheduled: postsByStatus["scheduled"] || 0,
        published: postsByStatus["published"] || 0,
        pending_approval: postsByStatus["pending_approval"] || 0,
        failed: postsByStatus["failed"] || 0,
      },
      pendingApprovals: approvalRows?.length || 0,
      recentEvents: (eventRows || []).slice(0, 20),
      recentJobs: jobRows || [],
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json({ stats })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: msg === "auth_required" ? 401 : 500 })
  }
}
