import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { resumeDocumentSchema } from "@/lib/career-resume"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import {
  claimExtraResumeCredit,
  consumeCareerUsage,
  refundCareerUsage,
  releaseExtraResumeCredit,
} from "@/lib/server/career-usage"

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
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("resume_documents")
      .select("*")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })

    if (error) return NextResponse.json({ error: "Resumes could not be loaded." }, { status: 500 })
    const rows = (data || []) as unknown as Record<string, unknown>[]
    return NextResponse.json({ resumes: rows.map(toClient) })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = resumeDocumentSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the resume fields.", details: parsed.error.flatten() }, { status: 400 })

    let usageConsumed = false
    let creditOrderId: string | null = null
    const usage = await consumeCareerUsage(user.id, planCheck.plan, "resume_generation")
    usageConsumed = usage.allowed
    if (!usage.allowed) {
      creditOrderId = await claimExtraResumeCredit(user.id)
      if (!creditOrderId) return NextResponse.json({ error: "Your monthly resume limit is reached. Upgrade or add an extra resume credit." }, { status: 429 })
    }
    const releaseReservation = async () => {
      if (usageConsumed) await refundCareerUsage(user.id, "resume_generation")
      if (creditOrderId) await releaseExtraResumeCredit(user.id, creditOrderId)
    }

    const input = parsed.data
    const scoped = createScopedClient(planCheck.workspaceId)
    const { data, error } = await scoped
      .from("resume_documents")
      .insert({
        user_id: user.id,
        title: input.title,
        template_key: input.templateKey,
        target_role: input.targetRole,
        target_company: input.targetCompany,
        job_description: input.jobDescription,
        resume_data: input.resumeData,
        analysis: input.analysis,
        ats_score: input.atsScore,
        status: input.status,
      })
      .select("*")
      .single()

    if (error) {
      await releaseReservation()
      return NextResponse.json({ error: "Resume could not be created." }, { status: 500 })
    }
    const savedResume = data as unknown as { id: string }
    // resume_versions has no workspace_id column of its own (scoped
    // indirectly via resume_id, just created above) - use .raw.
    const { error: versionError } = await scoped.from("resume_versions").raw.insert({ resume_id: savedResume.id, version_number: 1, resume_data: input.resumeData, analysis: input.analysis })
    if (versionError) {
      await scoped.from("resume_documents").delete().eq("id", savedResume.id)
      await releaseReservation()
      return NextResponse.json({ error: "Resume could not be versioned." }, { status: 500 })
    }
    return NextResponse.json({ resume: toClient(data as unknown as Record<string, unknown>) }, { status: 201 })
  })(request)
}
