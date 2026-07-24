import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/server/workspace"
import { markPayoutPaid } from "@/lib/server/referrals"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function POST(request: NextRequest) {
  try {
    await requireAdminRequest(request)
  } catch {
    return notFound()
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const payoutId = String(body.payoutId ?? "").trim()
  const paymentReference = String(body.paymentReference ?? "").trim()
  if (!payoutId || !paymentReference) {
    return NextResponse.json({ error: "payoutId and paymentReference are required." }, { status: 400 })
  }

  const result = await markPayoutPaid(payoutId, paymentReference)
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Could not mark payout as paid." }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
