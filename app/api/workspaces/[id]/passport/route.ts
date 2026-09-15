import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hasPermission } from "@/lib/server/roles"
import { agencyErrorResponse, requireWorkspaceAccess } from "@/lib/server/agency/access"
import {
  MAX_PASSPORT_ENTRIES,
  PASSPORT_KINDS,
  addPassportEntry,
  deletePassportEntry,
  getVoicePassport,
  updatePassportSummary,
} from "@/lib/server/agency/voice-passport"

type Context = { params: Promise<{ id: string }> }

const entrySchema = z.object({
  kind: z.enum(PASSPORT_KINDS),
  body: z.string().trim().min(2).max(600),
  note: z.string().trim().max(600).optional().default(""),
  sourceApprovalId: z.string().uuid().optional(),
})
const summarySchema = z.object({ summary: z.string().trim().max(2000) })

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace, role, ctx } = await requireWorkspaceAccess(id, "viewer")
    const passport = await getVoicePassport(workspace.id)
    return NextResponse.json({
      workspace: { id: workspace.id, name: workspace.name, type: workspace.workspace_type, brandingColor: workspace.branding_color },
      ...passport,
      limit: MAX_PASSPORT_ENTRIES,
      permissions: {
        canAdd: hasPermission(role, "editor"),
        canManage: hasPermission(role, "admin"),
        userId: ctx.supabaseUserId,
      },
    })
  } catch (error) {
    return agencyErrorResponse(error, "agency.passport_read")
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace, ctx } = await requireWorkspaceAccess(id, "editor")
    const parsed = entrySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    const entry = await addPassportEntry({ workspaceId: workspace.id, createdBy: ctx.supabaseUserId, ...parsed.data })
    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    if ((error as Error).message === "passport_full") return NextResponse.json({ error: "passport_full" }, { status: 409 })
    return agencyErrorResponse(error, "agency.passport_add")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin")
    const parsed = summarySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    const summary = await updatePassportSummary(workspace.id, parsed.data.summary || null)
    return NextResponse.json({ summary })
  } catch (error) {
    return agencyErrorResponse(error, "agency.passport_summary")
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace, role, ctx } = await requireWorkspaceAccess(id, "editor")
    await deletePassportEntry(workspace.id, request.nextUrl.searchParams.get("entryId") || "", {
      userId: ctx.supabaseUserId,
      canManage: hasPermission(role, "admin"),
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return agencyErrorResponse(error, "agency.passport_delete")
  }
}
