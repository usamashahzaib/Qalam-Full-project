export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { getCanonicalPlan, incrementUsage, decrementUsage } from "@/lib/server/plan-limits-v2"
import { agencyErrorResponse } from "@/lib/server/agency/access"
import {
  PITCH_MONTHLY_LIMIT,
  countRecentPitches,
  generatePitchSamples,
  listPitches,
  revokePitch,
  savePitch,
} from "@/lib/server/agency/pitch"

const createSchema = z.object({
  agencyName: z.string().trim().min(2).max(100),
  prospectName: z.string().trim().min(2).max(100),
  prospectRole: z.string().trim().max(160).optional().default(""),
  focus: z.string().trim().max(300).optional().default(""),
  sourcePosts: z.string().trim().min(300).max(20000),
})

async function requireAgencyOwner() {
  const ctx = await getWorkspaceSessionContext()
  const plan = await getCanonicalPlan(ctx.supabaseUserId)
  if (plan !== "Agency") throw new Error("upgrade_required")
  return { ctx, plan }
}

export async function GET() {
  try {
    const { ctx } = await requireAgencyOwner()
    const [pitches, used] = await Promise.all([listPitches(ctx.supabaseUserId), countRecentPitches(ctx.supabaseUserId)])
    return NextResponse.json({ pitches, usage: { used, limit: PITCH_MONTHLY_LIMIT } })
  } catch (error) {
    return agencyErrorResponse(error, "agency.pitch_list")
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ctx, plan } = await requireAgencyOwner()
    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    if (await countRecentPitches(ctx.supabaseUserId) >= PITCH_MONTHLY_LIMIT) {
      return NextResponse.json({ error: "pitch_limit_reached", limit: PITCH_MONTHLY_LIMIT }, { status: 429 })
    }

    const usage = await incrementUsage(ctx.supabaseUserId, "drafts")
    if (!usage.allowed) return NextResponse.json({ error: "draft_limit_reached" }, { status: 403 })

    let samples
    try {
      samples = await generatePitchSamples({
        prospectName: parsed.data.prospectName,
        prospectRole: parsed.data.prospectRole || null,
        sourcePosts: parsed.data.sourcePosts,
        focus: parsed.data.focus || null,
        userId: ctx.supabaseUserId,
        plan,
      })
    } catch (error) {
      await decrementUsage(ctx.supabaseUserId, "drafts").catch(() => undefined)
      return NextResponse.json({ error: "generation_failed", message: (error as Error).message }, { status: 502 })
    }

    const saved = await savePitch({
      ownerId: ctx.supabaseUserId,
      agencyName: parsed.data.agencyName,
      prospectName: parsed.data.prospectName,
      prospectRole: parsed.data.prospectRole || null,
      samples,
    })
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    return agencyErrorResponse(error, "agency.pitch_create")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ctx } = await requireAgencyOwner()
    await revokePitch(ctx.supabaseUserId, request.nextUrl.searchParams.get("pitchId") || "")
    return NextResponse.json({ ok: true })
  } catch (error) {
    return agencyErrorResponse(error, "agency.pitch_revoke")
  }
}
