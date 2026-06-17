import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { hashToken } from "@/lib/server/password"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = _request.nextUrl.searchParams.get("token")?.trim() || ""

  const supabase = createServiceClient()

  const { data: approval } = await supabase
    .from("approvals")
    .select("id, post_title, post_content, status, message, comment, created_at, updated_at, review_token_hash")
    .eq("id", id)
    .maybeSingle()

  if (!approval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (approval.review_token_hash && hashToken(token) !== approval.review_token_hash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { review_token_hash: _reviewTokenHash, ...safeApproval } = approval
  return NextResponse.json({ approval: safeApproval })
}
