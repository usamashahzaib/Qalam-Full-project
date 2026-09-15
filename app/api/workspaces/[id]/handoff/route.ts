import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePlan } from "@/lib/server/require-plan"
import { agencyErrorResponse, requireWorkspaceAccess } from "@/lib/server/agency/access"
import {
  HANDOFF_DAILY_LIMIT,
  countRecentHandoffs,
  createHandoffLink,
  listHandoffLinks,
  revokeHandoffLink,
} from "@/lib/server/agency/handoff"
import { getLinkedInPublishingAccountSummary } from "@/lib/server/agency/linkedin-status"

type Context = { params: Promise<{ id: string }> }

const createSchema = z.object({
  recipientName: z.string().trim().max(100).optional().default(""),
  recipientEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]).optional().default(""),
  sendEmail: z.boolean().optional().default(false),
})

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })
    const [links, linkedIn] = await Promise.all([
      listHandoffLinks(workspace.id),
      getLinkedInPublishingAccountSummary(workspace.id),
    ])
    return NextResponse.json({
      links,
      linkedIn,
      defaultRecipient: { name: workspace.client_contact_name, email: workspace.client_contact_email },
    })
  } catch (error) {
    return agencyErrorResponse(error, "agency.handoff_list")
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const planCheck = await requirePlan(request, "Agency", id)
    if (!planCheck.ok) return planCheck.response
    const { ctx, workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })

    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    if (parsed.data.sendEmail && !parsed.data.recipientEmail) {
      return NextResponse.json({ error: "recipient_email_required" }, { status: 400 })
    }
    if (await countRecentHandoffs(workspace.id) >= HANDOFF_DAILY_LIMIT) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 })
    }

    const result = await createHandoffLink({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      createdBy: ctx.supabaseUserId,
      inviterName: ctx.fullName,
      recipientName: parsed.data.recipientName || null,
      recipientEmail: parsed.data.recipientEmail || null,
      source: "manual",
      sendEmail: parsed.data.sendEmail,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return agencyErrorResponse(error, "agency.handoff_create")
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true, allowArchived: true })
    await revokeHandoffLink(workspace.id, request.nextUrl.searchParams.get("linkId") || "")
    return NextResponse.json({ ok: true })
  } catch (error) {
    return agencyErrorResponse(error, "agency.handoff_revoke")
  }
}
