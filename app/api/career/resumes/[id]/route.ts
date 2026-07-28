import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { resumeDocumentSchema } from "@/lib/career-resume"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/plan-limits-v2"
import { authorizeRole } from "@/lib/server/roles"

const toClient = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  templateKey: row.template_key,
  targetRole: row.target_role,
  targetCompany: row.target_company,
  jobDescription: row.job_description,
  resumeData: row.resume_data,
  analysis: row.analysis,
  atsScore: row.ats_score,
  status: row.status,
})

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { id } = await context.params
    const { data, error } = await createServiceClient().from("resume_documents").select("*").eq("id", id).eq("workspace_id", planCheck.workspaceId).maybeSingle()
    if (error || !data) return NextResponse.json({ error: "Resume not found." }, { status: 404 })
    return NextResponse.json({ resume: toClient(data) })
  })(request)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await context.params
    const parsed = resumeDocumentSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the resume fields." }, { status: 400 })
    const input = parsed.data
    const supabase = createServiceClient()
    const { data: existing } = await supabase.from("resume_documents").select("id").eq("id", id).eq("workspace_id", planCheck.workspaceId).maybeSingle()
    if (!existing) return NextResponse.json({ error: "Resume not found." }, { status: 404 })
    const { count } = await supabase.from("resume_versions").select("id", { count: "exact", head: true }).eq("resume_id", id)
    const { data, error } = await supabase
      .from("resume_documents")
      .update({
        title: input.title,
        template_key: input.templateKey,
        target_role: input.targetRole,
        target_company: input.targetCompany,
        job_description: input.jobDescription,
        resume_data: input.resumeData,
        analysis: input.analysis,
        ats_score: input.atsScore,
        status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) return NextResponse.json({ error: "Resume could not be saved." }, { status: 500 })
    await supabase.from("resume_versions").insert({ resume_id: id, version_number: (count || 0) + 1, resume_data: input.resumeData, analysis: input.analysis })
    return NextResponse.json({ resume: toClient(data) })
  })(request)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await context.params
    const { error } = await createServiceClient().from("resume_documents").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", planCheck.workspaceId)
    if (error) return NextResponse.json({ error: "Resume could not be archived." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
