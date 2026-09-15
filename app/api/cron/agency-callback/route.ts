import { NextResponse } from "next/server"
import { qstashReceiver } from "@/lib/server/qstash"
import { processAutoApprove } from "@/lib/server/agency/approval-decision"
import { log } from "@/lib/server/logging"

export const maxDuration = 30
export const runtime = "nodejs"

export async function POST(request: Request) {
  const receiver = qstashReceiver()
  if (!receiver) return NextResponse.json({ error: "qstash_not_configured" }, { status: 500 })

  const signature = request.headers.get("upstash-signature")
  const body = await request.text()
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 401 })

  const verified = await receiver.verify({ signature, body }).catch(() => false)
  if (!verified) return NextResponse.json({ error: "invalid_signature" }, { status: 401 })

  let payload: { job?: string; approvalId?: string }
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  if (payload.job === "auto-approve" && payload.approvalId) {
    const outcome = await processAutoApprove(String(payload.approvalId))
    log.info("agency.callback_auto_approve", { approvalId: payload.approvalId, outcome })
    return NextResponse.json({ outcome })
  }
  return NextResponse.json({ error: "unknown_job" }, { status: 400 })
}
