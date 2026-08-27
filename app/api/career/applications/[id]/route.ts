import { NextRequest, NextResponse } from "next/server"
import { applicationUpdateSchema } from "@/lib/career-outcomes"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"

type ExistingApplication = { id: string; status: string; resume_id: string | null; resume_version_id: string | null }
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await params
    const parsed = applicationUpdateSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the application update.", details: parsed.error.flatten() }, { status: 400 })

    const scoped = createScopedClient(planCheck.workspaceId)
    const { data: existingRaw } = await scoped.from("career_applications").select("id,status,resume_id,resume_version_id").eq("id", id).maybeSingle()
    const existing = existingRaw as unknown as ExistingApplication | null
    if (!existing) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    const input = parsed.data
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.status !== undefined) payload.status = input.status
    if (input.resumeId !== undefined) {
      const { data: ownedResume } = input.resumeId
        ? await scoped.from("resume_documents").select("id").eq("id", input.resumeId).maybeSingle()
        : { data: null }
      if (input.resumeId && !ownedResume) return NextResponse.json({ error: "Resume not found." }, { status: 404 })
      payload.resume_id = input.resumeId
      // resume_versions has no workspace_id column of its own - use .raw (see
      // the same pattern in app/api/career/applications/route.ts).
      const { data: version } = input.resumeId ? await scoped.from("resume_versions").raw.select("id").eq("resume_id", input.resumeId).order("version_number", { ascending: false }).limit(1).maybeSingle() : { data: null }
      payload.resume_version_id = (version as unknown as { id: string } | null)?.id || null
    }
    if (input.excitement !== undefined) payload.excitement = input.excitement
    if (input.nextAction !== undefined) payload.next_action = input.nextAction
    if (input.nextActionAt !== undefined) payload.next_action_at = input.nextActionAt
    if (input.notes !== undefined) payload.notes = input.notes
    if (input.rejectionReason !== undefined) payload.rejection_reason = input.rejectionReason
    if (input.offerAmount !== undefined) payload.offer_amount = input.offerAmount
    if (input.offerCurrency !== undefined) payload.offer_currency = input.offerCurrency
    if (input.status === "applied") payload.applied_at = new Date().toISOString()

    const { data, error } = await scoped.from("career_applications").update(payload).eq("id", id).select("*, job:career_jobs(*)").single()
    if (error) return NextResponse.json({ error: "Application could not be updated." }, { status: 500 })

    if (input.status && input.status !== existing.status) {
      await scoped.from("career_application_events").insert({ application_id: id, user_id: user.id, event_type: "status_changed", from_status: existing.status, to_status: input.status })
    } else if (input.resumeId !== undefined && input.resumeId !== existing.resume_id) {
      await scoped.from("career_application_events").insert({ application_id: id, user_id: user.id, event_type: "resume_attached", metadata: { resume_id: input.resumeId, resume_version_id: payload.resume_version_id || null } })
    }
    return NextResponse.json({ application: data })
  })(request)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await params
    const { error } = await createScopedClient(planCheck.workspaceId).from("career_applications").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id)
    if (error) return NextResponse.json({ error: "Application could not be archived." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
