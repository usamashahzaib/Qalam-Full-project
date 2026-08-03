import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
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
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const { data, error } = await createServiceClient()
      .from("cover_letter_documents")
      .select("*")
      .eq("workspace_id", planCheck.workspaceId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })

    if (error) return NextResponse.json({ error: "Cover letters could not be loaded." }, { status: 500 })
    return NextResponse.json({ coverLetters: (data || []).map(toClient) })
  })(request)
}
