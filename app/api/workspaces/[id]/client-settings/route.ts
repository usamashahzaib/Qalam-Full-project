import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePlan } from "@/lib/server/require-plan"
import { supabasePatch } from "@/lib/server/supabase-rest"
import { agencyErrorResponse, requireWorkspaceAccess, type AgencyWorkspace } from "@/lib/server/agency/access"
import { AUTO_APPROVE_HOUR_OPTIONS } from "@/lib/agency/approval-timing"

type Context = { params: Promise<{ id: string }> }

const settingsSchema = z.object({
  cadencePostsPerWeek: z.number().int().min(1).max(14).optional(),
  autoApproveHours: z.union([z.null(), z.number().int().refine((value) => (AUTO_APPROVE_HOUR_OPTIONS as readonly number[]).includes(value))]).optional(),
  voiceDropEnabled: z.boolean().optional(),
  monthlyProofEnabled: z.boolean().optional(),
}).strict()

const toSettings = (workspace: AgencyWorkspace) => ({
  cadencePostsPerWeek: workspace.cadence_posts_per_week,
  autoApproveHours: workspace.auto_approve_hours,
  voiceDropEnabled: workspace.voice_drop_enabled,
  monthlyProofEnabled: workspace.monthly_proof_enabled,
  clientContactName: workspace.client_contact_name,
  clientContactEmail: workspace.client_contact_email,
})

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })
    return NextResponse.json({ settings: toSettings(workspace) })
  } catch (error) {
    return agencyErrorResponse(error, "agency.client_settings_read")
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const planCheck = await requirePlan(request, "Agency", id)
    if (!planCheck.ok) return planCheck.response
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })

    const parsed = settingsSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
    const input = parsed.data
    if ((input.voiceDropEnabled || input.monthlyProofEnabled) && !workspace.client_contact_email) {
      return NextResponse.json({ error: "client_contact_email_required" }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.cadencePostsPerWeek !== undefined) patch.cadence_posts_per_week = input.cadencePostsPerWeek
    if (input.autoApproveHours !== undefined) patch.auto_approve_hours = input.autoApproveHours
    if (input.voiceDropEnabled !== undefined) patch.voice_drop_enabled = input.voiceDropEnabled
    if (input.monthlyProofEnabled !== undefined) patch.monthly_proof_enabled = input.monthlyProofEnabled

    const rows = await supabasePatch<AgencyWorkspace>("workspaces", `id=eq.${workspace.id}`, patch)
    const updated = rows?.[0]
    if (!updated) throw new Error("not_found")
    return NextResponse.json({ settings: toSettings({ ...workspace, ...updated }) })
  } catch (error) {
    return agencyErrorResponse(error, "agency.client_settings_update")
  }
}
