import { NextRequest, NextResponse } from "next/server"
import { loadApproval, publicApprovalView, reviewTokenMatches } from "@/lib/server/agency/approval-decision"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await publicShareLimit(request, "review")
  if (limited) return limited

  const { id } = await params
  const token = request.nextUrl.searchParams.get("token")?.trim() || ""
  const approval = await loadApproval(id).catch(() => null)

  // Require a valid token always. A null hash means the row was created without
  // token generation, or it was already decided - treat as inaccessible.
  if (!approval || !reviewTokenMatches(approval, token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ approval: publicApprovalView(approval) }, { headers: { "Cache-Control": "no-store" } })
}
