import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createCheckoutSession } from "@/lib/server/checkout-session"
import { getDiscountForUser } from "@/lib/server/referrals"
import { createReferralDiscountCode } from "@/lib/server/lemonsqueezy-api"
import { getClientIp, TokenBucket } from "@/lib/server/rate-limit"

const checkoutLimiter = new TokenBucket(5, 5, 60 * 60 * 1000)

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const allowed = await checkoutLimiter.tryConsume(`${user.id}:${getClientIp(req)}`)
    if (!allowed) {
      return NextResponse.json({ error: "Too many checkout attempts. Try again later." }, { status: 429 })
    }

    const discountPercent = await getDiscountForUser(user.id)
    const [token, discountCode] = await Promise.all([
      createCheckoutSession(user.id),
      discountPercent > 0 ? createReferralDiscountCode(discountPercent) : Promise.resolve(null),
    ])
    return NextResponse.json({
      token,
      discountCode,
    })
  })(request)
}
