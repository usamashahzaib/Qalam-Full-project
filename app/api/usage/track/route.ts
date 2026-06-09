import { NextRequest, NextResponse } from "next/server"
import { requireAuthApi } from "@/lib/server/auth"
import { getPlanStatus } from "@/lib/server/plan-limits-v2"

export async function GET(request: NextRequest) {
  const { externalUserId, error } = await requireAuthApi(request)
  if (error) return error
  if (!externalUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const status = await getPlanStatus(externalUserId)
  return NextResponse.json({
    plan: status.plan,
    drafts: status.drafts,
    hooks: status.hooks,
    analyses: status.analyses,
    cycleEnd: status.cycleEnd,
  })
}
