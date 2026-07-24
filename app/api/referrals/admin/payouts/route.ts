import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/server/workspace"
import { getAdminPayoutQueue } from "@/lib/server/referrals"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request)
  } catch {
    return notFound()
  }

  const payouts = await getAdminPayoutQueue()
  return NextResponse.json({ payouts })
}
