import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const createSchema = z.object({
  action: z.literal("create"),
  workspaceKey: z.string().uuid().optional(),
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).default(""),
})
const joinSchema = z.object({ action: z.literal("join"), code: z.string().trim().min(6).max(20) })

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()
    const { data: memberships } = await supabase.from("career_cohort_members").select("cohort_id, role, joined_at").eq("user_id", user.id)
    const ids = (memberships || []).map((item) => item.cohort_id)
    if (!ids.length) return NextResponse.json({ cohorts: [] })
    const { data } = await supabase.from("career_cohorts").select("id, name, code, description, is_active, owner_user_id").in("id", ids)
    const cohorts = (data || []).map((cohort) => ({ ...cohort, role: memberships?.find((item) => item.cohort_id === cohort.id)?.role }))
    return NextResponse.json({ cohorts })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const body = await req.json().catch(() => null)
    const supabase = createServiceClient()
    if (body?.action === "join") {
      const parsed = joinSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: "Use a valid cohort code." }, { status: 400 })
      const { data: cohort } = await supabase.from("career_cohorts").select("id").eq("code", parsed.data.code.toUpperCase()).eq("is_active", true).maybeSingle()
      if (!cohort) return NextResponse.json({ error: "Cohort not found." }, { status: 404 })
      const { error } = await supabase.from("career_cohort_members").upsert({ cohort_id: cohort.id, user_id: user.id, role: "learner" }, { onConflict: "cohort_id,user_id" })
      if (error) return NextResponse.json({ error: "Cohort could not be joined." }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Add a cohort name." }, { status: 400 })
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const code = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()
    const { data, error } = await supabase.from("career_cohorts").insert({ workspace_id: planCheck.workspaceId, owner_user_id: user.id, name: parsed.data.name, description: parsed.data.description, code }).select("id, name, code").single()
    if (error) return NextResponse.json({ error: "Cohort could not be created." }, { status: 500 })
    await supabase.from("career_cohort_members").insert({ cohort_id: data.id, user_id: user.id, role: "instructor" })
    return NextResponse.json({ cohort: data }, { status: 201 })
  })(request)
}
