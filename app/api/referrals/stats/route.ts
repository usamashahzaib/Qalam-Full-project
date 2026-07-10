import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { getReferralStats, getDiscountForUser } from "@/lib/server/referrals"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const [stats, activeDiscountPercent] = await Promise.all([
      getReferralStats(user.id, user.email),
      getDiscountForUser(user.id),
    ])
    return NextResponse.json({ ...stats, activeDiscountPercent })
  })(request)
}
