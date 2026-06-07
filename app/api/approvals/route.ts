import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

type DbPost = { id: string; title: string; status: string; type: string; content: string | null; updated_at: string }
type DbApproval = { id: string; post_id: string; reviewer_id: string | null; status: string; comments: string | null; created_at: string; updated_at: string }

/** GET /api/approvals - list all posts pending approval in the workspace */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)

    const pending = await supabaseSelect<DbPost>(
      "posts",
      `workspace_id=eq.${workspaceId}&status=in.(pending_approval,approved,rejected)&order=updated_at.desc&limit=100`
    )

    const postIds = (pending || []).map((p) => p.id)
    let approvals: DbApproval[] = []
    if (postIds.length > 0) {
      approvals =
        (await supabaseSelect<DbApproval>(
          "approvals",
          `post_id=in.(${postIds.join(",")})&order=created_at.desc`
        )) || []
    }

    const approvalsByPostId = new Map(approvals.map((a) => [a.post_id, a]))

    const items = (pending || []).map((post) => ({
      post,
      approval: approvalsByPostId.get(post.id) || null,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

/**
 * POST /api/approvals - approve or reject a post.
 * Requires: client_reviewer, agency_admin, or super_admin.
 * editors and viewers cannot approve/reject.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)

    // ── Role check: must be client_reviewer or above ──────────────────────
    const { userId: reviewerUserId } = await requireRole(request, workspaceId, "client_reviewer")
    // ─────────────────────────────────────────────────────────────────────

    const body = await request.json()
    const { postId, decision, comments } = body as {
      postId: string
      decision: "approved" | "rejected"
      comments?: string
    }

    if (!postId || !["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "postId and valid decision (approved|rejected) required" },
        { status: 400 }
      )
    }

    // Verify post belongs to this workspace
    const posts = await supabaseSelect<{ id: string }>(
      "posts",
      `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`
    )
    if (!posts || posts.length === 0) {
      return NextResponse.json({ error: "post_not_found" }, { status: 404 })
    }

    // Write approval record with resolved reviewerId
    const approval = await supabaseInsert<DbApproval>(
      "approvals",
      {
        post_id: postId,
        reviewer_id: reviewerUserId,
        status: decision,
        comments: comments ?? null,
      },
      "return=representation"
    )

    // Update post status
    await supabasePatch("posts", `id=eq.${postId}`, {
      status: decision,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ approval: approval?.[0] || null, postStatus: decision })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

