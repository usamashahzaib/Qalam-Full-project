import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { env } from "@/lib/server/env"
import { hashToken } from "@/lib/server/password"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = request.nextUrl.searchParams.get("token")?.trim() || ""

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* empty body is fine */ }

  const comment = String(body.comment || "").trim()

  const supabase = createServiceClient()

  const { data: approval } = await supabase
    .from("approvals")
    .select("id, post_id, workspace_id, requester_id, reviewer_email, post_title, status, review_token_hash, review_token_expires_at")
    .eq("id", id)
    .maybeSingle()

  if (!approval) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
  }
  if (!approval.review_token_hash || !approval.review_token_expires_at || new Date(approval.review_token_expires_at).getTime() <= Date.now() || hashToken(token) !== approval.review_token_hash) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
  }

  if (approval.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from("approvals")
    .update({
      status: "approved",
      comment: comment || null,
      review_token_hash: null,
      review_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Failed to update approval" }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 })
  }

  // Reflect the approval on the linked post so the writer/agency sees it
  // move out of "pending_approval" without a separate manual step.
  if (approval.post_id) {
    await supabase
      .from("posts")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", approval.post_id)
      .eq("workspace_id", approval.workspace_id)
      .eq("status", "pending_approval")
      .then(undefined, () => undefined)
  }

  // Notify requester via email (best-effort)
  try {
    const { data: requester } = await supabase
      .from("users")
      .select("email")
      .eq("id", approval.requester_id)
      .maybeSingle()
    if (requester?.email) {
      const approvalsUrl = `${env.frontendOrigin}/approvals`
      await sendTransactionalEmail({
        to: requester.email,
        subject: `Approved: "${approval.post_title}"`,
        text: [
          `"${approval.post_title}" has been approved.`,
          comment ? `Reviewer note: "${comment}"` : "",
          "",
          `View your approvals: ${approvalsUrl}`,
        ].filter(Boolean).join("\n"),
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ status: "approved", comment: comment || null })
}
