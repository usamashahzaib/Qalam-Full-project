import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePlan } from "@/lib/server/require-plan"
import { supabasePatch } from "@/lib/server/supabase-rest"
import { agencyErrorResponse, requireWorkspaceAccess, type AgencyWorkspace } from "@/lib/server/agency/access"
import { AUTO_APPROVE_HOUR_OPTIONS } from "@/lib/agency/approval-timing"
import { poolStatus, setAllocation } from "@/lib/server/agency/pool"
import { log } from "@/lib/server/logging"

type Context = { params: Promise<{ id: string }> }

const settingsSchema = z.object({
  cadencePostsPerWeek: z.number().int().min(1).max(14).optional(),
  autoApproveHours: z.union([z.null(), z.number().int().refine((value) => (AUTO_APPROVE_HOUR_OPTIONS as readonly number[]).includes(value))]).optional(),
  voiceDropEnabled: z.boolean().optional(),
  monthlyProofEnabled: z.boolean().optional(),
  // null resets this workspace to the plan default share of the pool.
  draftAllowance: z.union([z.null(), z.number().int().min(0)]).optional(),
  carouselAllowance: z.union([z.null(), z.number().int().min(0)]).optional(),
}).strict()

const toSettings = async (workspace: AgencyWorkspace) => {
  const ownerId = workspace.owner_id
  // Pool figures are display-only here (every write is validated in the
  // database), so a failed lookup hides the breakdown instead of failing the
  // whole settings response.
  const [drafts, carousels] = ownerId
    ? await Promise.all([
        poolStatus(ownerId, workspace.id, "drafts", workspace.monthly_draft_allowance),
        poolStatus(ownerId, workspace.id, "carousels", workspace.monthly_carousel_allowance),
      ]).catch((error: unknown) => {
        log.error("agency.pool_status_failed", { workspaceId: workspace.id, error: (error as Error).message })
        return [null, null] as const
      })
    : [null, null]

  return {
    cadencePostsPerWeek: workspace.cadence_posts_per_week,
    autoApproveHours: workspace.auto_approve_hours,
    voiceDropEnabled: workspace.voice_drop_enabled,
    monthlyProofEnabled: workspace.monthly_proof_enabled,
    clientContactName: workspace.client_contact_name,
    clientContactEmail: workspace.client_contact_email,
    draftAllowance: workspace.monthly_draft_allowance,
    carouselAllowance: workspace.monthly_carousel_allowance,
    draftPool: drafts,
    carouselPool: carousels,
  }
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const { workspace } = await requireWorkspaceAccess(id, "admin", { clientOnly: true })
    return NextResponse.json({ settings: await toSettings(workspace) })
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
    if (!workspace.owner_id) return NextResponse.json({ error: "workspace_owner_missing" }, { status: 409 })

    // Reallocating this workspace's share must never let the sum across the
    // owner's client workspaces exceed the pool the Agency plan sells. The
    // check and the write happen in one locked database call, so concurrent
    // edits cannot both pass, and a reset to the default share (null) is
    // validated like any other value.
    if (input.draftAllowance !== undefined || input.carouselAllowance !== undefined) {
      const result = await setAllocation(workspace.id, { drafts: input.draftAllowance, carousels: input.carouselAllowance })
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, feature: result.feature, poolTotal: result.poolTotal, allocatedToOthers: result.allocatedToOthers, remaining: result.remaining },
          { status: 400 }
        )
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.cadencePostsPerWeek !== undefined) patch.cadence_posts_per_week = input.cadencePostsPerWeek
    if (input.autoApproveHours !== undefined) patch.auto_approve_hours = input.autoApproveHours
    if (input.voiceDropEnabled !== undefined) patch.voice_drop_enabled = input.voiceDropEnabled
    if (input.monthlyProofEnabled !== undefined) patch.monthly_proof_enabled = input.monthlyProofEnabled

    const rows = await supabasePatch<AgencyWorkspace>("workspaces", `id=eq.${workspace.id}`, patch)
    const updated = rows?.[0]
    if (!updated) throw new Error("not_found")
    return NextResponse.json({ settings: await toSettings({ ...workspace, ...updated }) })
  } catch (error) {
    return agencyErrorResponse(error, "agency.client_settings_update")
  }
}
