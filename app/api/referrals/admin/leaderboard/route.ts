import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/server/workspace"
import { getAdminLeaderboard, getAdminReferralUses } from "@/lib/server/referrals"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request)
  } catch {
    return notFound()
  }

  const [leaderboard, referredUsers] = await Promise.all([getAdminLeaderboard(), getAdminReferralUses()])
  return NextResponse.json({ leaderboard, referredUsers })
}
