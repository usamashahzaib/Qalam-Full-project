import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { runApproval } from "@/lib/use-cases/run-approval"
import { errorToStatus } from "@/lib/errors"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()
    const { data: rows } = await supabase
      .from("approvals")
      .select("id, post_id, reviewer_email, post_title, post_content, status, message, comments, created_at, updated_at")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
    return NextResponse.json({ approvals: rows || [] })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const result = await runApproval({
      reviewerEmail: String(body.reviewerEmail || "").trim().toLowerCase(),
      postContent: String(body.postContent || "").trim(),
      postTitle: String(body.postTitle || "").trim(),
      message: String(body.message || "").trim() || undefined,
      postId: body.postId ? String(body.postId) : null,
      userId: user.id,
      userEmail: user.email || "",
      userName: user.name || null,
      plan: user.plan,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error.userMessage || result.error.message }, { status: errorToStatus(result.error.code) })
    }

    return NextResponse.json({ approvalId: result.data.approvalId, postTitle: result.data.postTitle }, { status: 201 })
  })(request)
}
