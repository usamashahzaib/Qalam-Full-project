import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requestPayout } from "@/lib/server/referrals"
import { TokenBucket, getClientIp } from "@/lib/server/rate-limit"

const requestPayoutLimiter = new TokenBucket(5, 5, 60 * 60 * 1000)

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const ip = getClientIp(req)
    const allowed = await requestPayoutLimiter.tryConsume(`referral_request_payout:${ip}`)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }

    const amount = Number(body.amount)
    const paymentMethod = String(body.paymentMethod ?? "").trim().toLowerCase()
    const accountDetails = String(body.accountDetails ?? "").trim()

    const result = await requestPayout(user.id, user.email, amount, paymentMethod, accountDetails)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Could not submit payout request." }, { status: 400 })
    }

    return NextResponse.json({ success: true, payoutId: result.payoutId }, { status: 201 })
  })(request)
}
