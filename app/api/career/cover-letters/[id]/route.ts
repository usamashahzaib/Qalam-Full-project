import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const toClient = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  targetRole: row.target_role,
  targetCompany: row.target_company,
  hiringManager: row.hiring_manager,
  jobDescription: row.job_description,
  content: row.content,
  status: row.status,
})

const updateSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(1).max(8000),
})

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { id } = await context.params
    const { data, error } = await createScopedClient(planCheck.workspaceId).from("cover_letter_documents").select("*").eq("id", id).maybeSingle()
    if (error || !data) return NextResponse.json({ error: "Cover letter not found." }, { status: 404 })
    return NextResponse.json({ coverLetter: toClient(data as unknown as Record<string, unknown>) })
  })(request)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await context.params
    const parsed = updateSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the cover letter fields." }, { status: 400 })
    const scoped = createScopedClient(planCheck.workspaceId)
    const { data: existing } = await scoped.from("cover_letter_documents").select("id").eq("id", id).maybeSingle()
    if (!existing) return NextResponse.json({ error: "Cover letter not found." }, { status: 404 })
    const { data, error } = await scoped
      .from("cover_letter_documents")
      .update({ title: parsed.data.title, content: parsed.data.content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single()
    if (error) return NextResponse.json({ error: "Cover letter could not be saved." }, { status: 500 })
    return NextResponse.json({ coverLetter: toClient(data as unknown as Record<string, unknown>) })
  })(request)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const { id } = await context.params
    const { error } = await createScopedClient(planCheck.workspaceId).from("cover_letter_documents").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id)
    if (error) return NextResponse.json({ error: "Cover letter could not be archived." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
