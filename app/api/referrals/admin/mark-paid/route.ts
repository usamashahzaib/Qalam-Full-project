import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession, isAdminEmail } from "@/lib/server/workspace"
import { markReferralPaid } from "@/lib/server/referrals"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

// Session + isAdminEmail only - see create-for-colleague/route.ts for why this
// intentionally differs from the header-gated app/api/admin/* ops routes.
const requireAdmin = async () => {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return notFound()
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const referredUserId = String(body.referredUserId ?? "").trim()
  const planName = String(body.planName ?? "").trim()
  const amountPaid = Number(body.amountPaid)

  if (!referredUserId || !planName || !Number.isFinite(amountPaid) || amountPaid < 0) {
    return NextResponse.json({ error: "referredUserId, planName, and a valid amountPaid are required." }, { status: 400 })
  }

  const result = await markReferralPaid(referredUserId, planName, amountPaid)
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Could not mark referral as paid." }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
