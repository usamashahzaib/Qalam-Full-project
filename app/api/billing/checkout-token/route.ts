import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createCheckoutSession } from "@/lib/server/checkout-session"
import { getDiscountForUser } from "@/lib/server/referrals"
import { REFERRAL_DISCOUNT_CODE } from "@/lib/pricing"

// Mints an opaque, server-stored token binding checkout to this account, and
// resolves whether this buyer has an active referral discount to apply. The
// discount code itself is only ever computed here, server-side, from the
// buyer's own referral record - never accepted from the client - so a buyer
// cannot self-grant a discount by guessing the code.
export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const [token, discountPercent] = await Promise.all([
      createCheckoutSession(user.id),
      getDiscountForUser(user.id).catch(() => 0),
    ])
    return NextResponse.json({
      token,
      discountCode: discountPercent > 0 ? REFERRAL_DISCOUNT_CODE : null,
    })
  })(request)
}
