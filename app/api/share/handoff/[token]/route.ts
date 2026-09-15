import { NextRequest, NextResponse } from "next/server"
import { handoffStatus, loadHandoffByToken } from "@/lib/server/agency/handoff"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const limited = await publicShareLimit(request, "handoff")
  if (limited) return limited
  const { token } = await context.params
  const handoff = await loadHandoffByToken(token).catch(() => null)
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({
    status: handoffStatus(handoff.row),
    workspaceName: handoff.workspaceName,
    inviterName: handoff.inviterName,
    recipientName: handoff.row.recipient_name,
    reason: handoff.row.source,
    expiresAt: handoff.row.expires_at,
  }, { headers: { "Cache-Control": "no-store" } })
}
