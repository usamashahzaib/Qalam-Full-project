import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePlan } from "@/lib/server/require-plan"
import { agencyErrorResponse, requireWorkspaceAccess } from "@/lib/server/agency/access"
import {
  PROOF_DAILY_LIMIT,
  collectProofSnapshot,
  countRecentProofReports,
  createProofReport,
  listProofReports,
  revokeProofReport,
} from "@/lib/server/agency/proof"

type Context = { params: Promise<{ id: string }> }

const createSchema = z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional().default(30) })

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })
    const previewDays = Number(request.nextUrl.searchParams.get("preview"))
    if ([7, 30, 90].includes(previewDays)) {
      return NextResponse.json({ preview: await collectProofSnapshot(workspace, previewDays) })
    }
    return NextResponse.json({ reports: await listProofReports(workspace.id) })
  } catch (error) {
    return agencyErrorResponse(error, "agency.proof_list")
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const planCheck = await requirePlan(request, "Agency", id)
    if (!planCheck.ok) return planCheck.response
    const { ctx, workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    if (await countRecentProofReports(workspace.id) >= PROOF_DAILY_LIMIT) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 })
    }
    return NextResponse.json(await createProofReport(workspace, parsed.data.days, ctx.supabaseUserId), { status: 201 })
  } catch (error) {
    return agencyErrorResponse(error, "agency.proof_create")
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true, allowArchived: true })
    await revokeProofReport(workspace.id, request.nextUrl.searchParams.get("reportId") || "")
    return NextResponse.json({ ok: true })
  } catch (error) {
    return agencyErrorResponse(error, "agency.proof_revoke")
  }
}
