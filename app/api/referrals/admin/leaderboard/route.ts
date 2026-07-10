import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession, isAdminEmail } from "@/lib/server/workspace"
import { getAdminLeaderboard, getAdminReferralUses } from "@/lib/server/referrals"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

const requireAdmin = async () => {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
}

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return notFound()
  }

  const [leaderboard, referredUsers] = await Promise.all([getAdminLeaderboard(), getAdminReferralUses()])
  return NextResponse.json({ leaderboard, referredUsers })
}
