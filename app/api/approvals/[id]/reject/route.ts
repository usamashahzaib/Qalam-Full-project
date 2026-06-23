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
    .select("id, requester_id, reviewer_email, post_title, status, review_token_hash")
    .eq("id", id)
    .maybeSingle()

  if (!approval) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
  }
  if (!approval.review_token_hash || hashToken(token) !== approval.review_token_hash) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
  }

  if (approval.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from("approvals")
    .update({
      status: "rejected",
      comment: comment || null,
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

  // Notify requester (best-effort)
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
        subject: `Needs revision: "${approval.post_title}"`,
        text: [
          `"${approval.post_title}" needs revision.`,
          comment ? `Reviewer comment: "${comment}"` : "",
          "",
          `View your approvals: ${approvalsUrl}`,
        ].filter(Boolean).join("\n"),
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ status: "rejected", comment: comment || null })
}
