import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePlan } from "@/lib/server/require-plan"
import { agencyErrorResponse, requireWorkspaceAccess } from "@/lib/server/agency/access"
import {
  VOICE_DROP_DAILY_LIMIT,
  countRecentVoiceDrops,
  createVoiceDrop,
  listVoiceDrops,
  updateVoiceDropState,
} from "@/lib/server/agency/voice-drops"
import { VOICE_DROP_QUESTIONS } from "@/lib/agency/voice-drop-questions"

type Context = { params: Promise<{ id: string }> }

const createSchema = z.object({ question: z.string().trim().min(5).max(300) })
const updateSchema = z.object({ dropId: z.string().uuid(), state: z.enum(["used", "dismissed"]) })

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "editor", { clientOnly: true })
    return NextResponse.json({
      drops: await listVoiceDrops(workspace.id),
      suggestions: VOICE_DROP_QUESTIONS,
      hasClientContactEmail: Boolean(workspace.client_contact_email),
      weeklyEnabled: workspace.voice_drop_enabled,
    })
  } catch (error) {
    return agencyErrorResponse(error, "agency.voice_drops_list")
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const planCheck = await requirePlan(request, "Agency", id)
    if (!planCheck.ok) return planCheck.response
    const { ctx, workspace } = await requireWorkspaceAccess(id, "editor", { clientOnly: true })
    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    if (!workspace.client_contact_email) return NextResponse.json({ error: "client_contact_email_required" }, { status: 400 })
    if (await countRecentVoiceDrops(workspace.id) >= VOICE_DROP_DAILY_LIMIT) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 })
    }
    const result = await createVoiceDrop({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      question: parsed.data.question,
      recipientEmail: workspace.client_contact_email,
      createdBy: ctx.supabaseUserId,
      askerName: ctx.fullName,
      source: "manual",
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return agencyErrorResponse(error, "agency.voice_drop_create")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "editor", { clientOnly: true })
    const parsed = updateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    const drop = await updateVoiceDropState(workspace.id, parsed.data.dropId, parsed.data.state)
    return NextResponse.json({ drop })
  } catch (error) {
    return agencyErrorResponse(error, "agency.voice_drop_update")
  }
}
