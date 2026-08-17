import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const organizationSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(180),
  organizationType: z.enum(["employer", "recruiter", "university", "bootcamp", "credential_body"]),
  website: z.string().trim().url().max(500).or(z.literal("")).default(""),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { data, error } = await createServiceClient().from("career_organizations").select("*").eq("workspace_id", planCheck.workspaceId).maybeSingle()
    if (error) return NextResponse.json({ error: "Organization could not be loaded." }, { status: 500 })
    return NextResponse.json({ organization: data })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "owner")
    if (roleError) return roleError
    const parsed = organizationSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the organization fields." }, { status: 400 })
    const input = parsed.data
    const supabase = createServiceClient()
    const { data, error } = await supabase.from("career_organizations").upsert({ workspace_id: planCheck.workspaceId, name: input.name, organization_type: input.organizationType, website: input.website || null, verification_status: "pending", verified_at: null, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" }).select("*").single()
    if (error || !data) return NextResponse.json({ error: "Organization could not be submitted." }, { status: 500 })
    await supabase.from("career_organization_members").upsert({ organization_id: data.id, user_id: user.id, role: "owner" }, { onConflict: "organization_id,user_id" })
    return NextResponse.json({ organization: data }, { status: 201 })
  })(request)
}
