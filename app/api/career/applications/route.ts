import { NextRequest, NextResponse } from "next/server"
import { applicationCreateSchema } from "@/lib/career-outcomes"
import { getCareerEntitlements } from "@/lib/career-entitlements"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"

type ApplicationRow = {
  id: string
  status: string
  resume?: { id: string; title: string } | null
  [key: string]: unknown
}
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const activeStatuses = ["saved", "applied", "screening", "interview", "offer"]

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("career_applications")
      .select("*, job:career_jobs(*), resume:resume_documents(id,title,ats_score,updated_at)")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message === "schema_not_applied" ? "schema_not_applied" : "Applications could not be loaded." }, { status: 500 })
    const applications = (data || []) as unknown as ApplicationRow[]
    const entitlements = getCareerEntitlements(planCheck.plan)
    const metrics = {
      total: applications.length,
      active: applications.filter((item) => activeStatuses.includes(item.status)).length,
      interviews: applications.filter((item) => item.status === "interview").length,
      offers: applications.filter((item) => item.status === "offer" || item.status === "accepted").length,
      responses: applications.filter((item) => !["saved", "applied"].includes(item.status)).length,
    }
    const advancedInsights = entitlements.advancedOutcomeInsights ? {
      byStatus: Object.fromEntries(["saved", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn"].map((status) => [status, applications.filter((item) => item.status === status).length])),
      resumePerformance: Object.values(applications.reduce<Record<string, { resumeId: string; title: string; applications: number; responses: number; interviews: number }>>((result, item) => {
        if (!item.resume?.id) return result
        const current = result[item.resume.id] || { resumeId: item.resume.id, title: item.resume.title, applications: 0, responses: 0, interviews: 0 }
        current.applications += 1
        if (!["saved", "applied"].includes(item.status)) current.responses += 1
        if (["interview", "offer", "accepted"].includes(item.status)) current.interviews += 1
        result[item.resume.id] = current
        return result
      }, {})).sort((a, b) => b.interviews - a.interviews || b.responses - a.responses),
    } : null
    return NextResponse.json({ applications, metrics, entitlements, advancedInsights })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const parsed = applicationCreateSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the application fields.", details: parsed.error.flatten() }, { status: 400 })

    const entitlements = getCareerEntitlements(planCheck.plan)
    const scoped = createScopedClient(planCheck.workspaceId)
    if (entitlements.activeApplications !== "unlimited" && activeStatuses.includes(parsed.data.status)) {
      const { count, error: countError } = await scoped
        .from("career_applications")
        .select("id", { count: "exact", head: true })
        .in("status", activeStatuses)
      if (countError) return NextResponse.json({ error: "Application limit could not be checked." }, { status: 500 })
      if ((count || 0) >= entitlements.activeApplications) {
        return NextResponse.json({ error: "active_application_limit", limit: entitlements.activeApplications, upgradeTo: "Solo" }, { status: 403 })
      }
    }

    const input = parsed.data
    const { data: ownedResume } = input.resumeId
      ? await scoped.from("resume_documents").select("id").eq("id", input.resumeId).maybeSingle()
      : { data: null }
    if (input.resumeId && !ownedResume) return NextResponse.json({ error: "Resume not found." }, { status: 404 })
    // resume_versions has no workspace_id column of its own (scoped indirectly
    // via resume_id -> resume_documents, already verified above) - use .raw.
    const { data: resumeVersion } = input.resumeId
      ? await scoped.from("resume_versions").raw.select("id").eq("resume_id", input.resumeId).order("version_number", { ascending: false }).limit(1).maybeSingle()
      : { data: null }
    const resumeVersionRow = resumeVersion as unknown as { id: string } | null
    const { data: job, error: jobError } = await scoped.from("career_jobs").insert({
      user_id: user.id,
      title: input.title,
      company: input.company,
      location: input.location,
      employment_type: input.employmentType,
      source_url: input.sourceUrl || null,
      source_name: input.sourceName,
      description: input.description,
    }).select("*").single()
    if (jobError || !job) return NextResponse.json({ error: "Job could not be saved." }, { status: 500 })
    const jobRow = job as unknown as { id: string }

    const { data: application, error } = await scoped.from("career_applications").insert({
      user_id: user.id,
      job_id: jobRow.id,
      resume_id: input.resumeId || null,
      resume_version_id: resumeVersionRow?.id || null,
      status: input.status,
      excitement: input.excitement ?? null,
      applied_at: input.appliedAt || (input.status === "applied" ? new Date().toISOString() : null),
      next_action: input.nextAction,
      next_action_at: input.nextActionAt || null,
      notes: input.notes,
    }).select("*").single()
    if (error || !application) {
      await scoped.from("career_jobs").delete().eq("id", jobRow.id)
      return NextResponse.json({ error: "Application could not be created." }, { status: 500 })
    }
    const applicationRow = application as unknown as { id: string }

    await scoped.from("career_application_events").insert({ application_id: applicationRow.id, user_id: user.id, event_type: "created", to_status: input.status, metadata: { resume_id: input.resumeId || null, resume_version_id: resumeVersionRow?.id || null } })
    return NextResponse.json({ application: { ...application, job } }, { status: 201 })
  })(request)
}
