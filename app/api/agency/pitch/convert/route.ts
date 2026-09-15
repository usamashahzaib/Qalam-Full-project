import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { getCanonicalPlan } from "@/lib/server/plan-limits-v2"
import { getPlanLimits } from "@/lib/entitlements"
import { agencyErrorResponse } from "@/lib/server/agency/access"
import { convertPitchToClient } from "@/lib/server/agency/pitch"

const convertSchema = z.object({ pitchId: z.string().uuid() }).strict()

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWorkspaceSessionContext()
    const plan = await getCanonicalPlan(ctx.supabaseUserId)
    const limits = getPlanLimits(plan)
    if (plan !== "Agency" || limits.clientWorkspaces === 0) throw new Error("upgrade_required")

    const parsed = convertSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new Error("invalid_input")

    const result = await convertPitchToClient({
      ownerId: ctx.supabaseUserId,
      pitchId: parsed.data.pitchId,
      maxClients: limits.clientWorkspaces === "unlimited" ? null : limits.clientWorkspaces,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return agencyErrorResponse(error, "agency.pitch_convert")
  }
}
