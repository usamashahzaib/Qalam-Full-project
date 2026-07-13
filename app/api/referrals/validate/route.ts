import { NextRequest, NextResponse } from "next/server"
import { validateReferralCode } from "@/lib/server/referrals"
import { TokenBucket, getClientIp } from "@/lib/server/rate-limit"

// Publicly reachable (anonymous referral landings) - mirror the /click limiter.
const validateLimiter = new TokenBucket(30, 30, 60 * 1000)

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const allowed = await validateLimiter.tryConsume(`referral_validate:${ip}`)
  if (!allowed) {
    return NextResponse.json({ valid: false, message: "rate_limited" }, { status: 429 })
  }

  const code = request.nextUrl.searchParams.get("code") || ""
  const result = await validateReferralCode(code)
  return NextResponse.json({
    valid: result.valid,
    discountPercent: result.discountPercent,
    remainingUses: result.remainingUses,
    referrerName: result.referrerName,
    message: result.error,
  })
}
