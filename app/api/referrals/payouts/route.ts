import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { getPayouts, getPayoutBalance } from "@/lib/server/referrals"

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const [payouts, balance] = await Promise.all([
      getPayouts(user.id),
      getPayoutBalance(user.id, user.email),
    ])
    return NextResponse.json({ payouts, balance })
  })(request)
}
