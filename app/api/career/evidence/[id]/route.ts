import { NextRequest, NextResponse } from "next/server"
import { evidenceSchema } from "@/lib/career-outcomes"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await params
    const parsed = evidenceSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the evidence fields." }, { status: 400 })
    const input = parsed.data
    const { data, error } = await createServiceClient().from("career_evidence").update({ evidence_type: input.evidenceType, title: input.title, summary: input.summary, source_url: input.sourceUrl || null, issuer: input.issuer || null, occurred_on: input.occurredOn || null, skills: input.skills, metrics: input.metrics, verification_status: input.sourceUrl ? "documented" : "self_reported", updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", planCheck.workspaceId).select("*").single()
    if (error) return NextResponse.json({ error: "Evidence could not be updated." }, { status: 500 })
    return NextResponse.json({ evidence: data })
  })(request)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await params
    const { error } = await createServiceClient().from("career_evidence").delete().eq("id", id).eq("workspace_id", planCheck.workspaceId)
    if (error) return NextResponse.json({ error: "Evidence could not be deleted." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
