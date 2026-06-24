import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { runApproval } from "@/lib/use-cases/run-approval"
import { errorToStatus } from "@/lib/errors"

const toApprovalRow = <T>(row: T) => row

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const { requirePlan } = await import("@/lib/server/plan-limits-v2")
    const planCheck = await requirePlan(_req, "Pro")
    if (!planCheck.ok) return planCheck.response

    const supabase = createServiceClient()
    const { data: rows } = await supabase
      .from("approvals")
      .select("id, post_id, reviewer_email, post_title, post_content, status, message, comment, created_at, updated_at")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
    return NextResponse.json({ approvals: (rows || []).map((row) => toApprovalRow(row)) })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const { requirePlan } = await import("@/lib/server/plan-limits-v2")
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response

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
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error.userMessage || result.error.message }, { status: errorToStatus(result.error.code) })
    }

    return NextResponse.json({ approval: toApprovalRow(result.data.approval) }, { status: 201 })
  })(request)
}
