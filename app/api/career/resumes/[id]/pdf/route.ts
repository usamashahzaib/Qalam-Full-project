import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { resumeDataSchema } from "@/lib/career-resume"
import { buildResumePdf, resumePdfFilename } from "@/lib/server/resume-pdf-export"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const { id } = await context.params
    const { data: dataRaw } = await createScopedClient(planCheck.workspaceId)
      .from("resume_documents")
      .select("title, template_key, resume_data")
      .eq("id", id)
      .maybeSingle()
    if (!dataRaw) return NextResponse.json({ error: "Resume not found." }, { status: 404 })
    const data = dataRaw as unknown as { title: string | null; template_key: string | null; resume_data: unknown }

    const parsed = resumeDataSchema.safeParse(data.resume_data)
    if (!parsed.success) return NextResponse.json({ error: "Resume data is invalid." }, { status: 422 })
    const bytes = await buildResumePdf(parsed.data, String(data.template_key || "clean"))
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resumePdfFilename(String(data.title || "ats-resume"))}"`,
        "Cache-Control": "private, no-store",
      },
    })
  })(request)
}
