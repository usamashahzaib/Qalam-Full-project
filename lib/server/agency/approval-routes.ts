import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { decideApproval, loadApproval, reviewTokenMatches } from "@/lib/server/agency/approval-decision"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

export async function handleReviewDecision(request: NextRequest, params: Promise<{ id: string }>, decision: "approved" | "rejected") {
  const limited = await publicShareLimit(request, "review")
  if (limited) return limited

  const { id } = await params
  const token = request.nextUrl.searchParams.get("token")?.trim() || ""
  const body = await request.json().catch(() => ({})) as { comment?: unknown; inlineComments?: unknown }

  const approval = await loadApproval(id).catch(() => null)
  if (!approval || !reviewTokenMatches(approval, token)) {
    if (approval && approval.status !== "pending") {
      return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 })
    }
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
  }

  const result = await decideApproval({
    approval,
    decision,
    comment: typeof body.comment === "string" ? body.comment : "",
    inlineComments: body.inlineComments,
  })
  if (!result.ok) {
    return result.error === "already_reviewed"
      ? NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 })
      : NextResponse.json({ error: "Failed to update approval" }, { status: 500 })
  }
  return NextResponse.json({ status: result.status, comment: result.comment, inlineComments: result.inlineComments })
}
