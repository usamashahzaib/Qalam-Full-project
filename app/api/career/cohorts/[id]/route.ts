import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(async (_req, user) => {
    const { id } = await context.params
    const supabase = createServiceClient()
    const { data: membership } = await supabase.from("career_cohort_members").select("role").eq("cohort_id", id).eq("user_id", user.id).maybeSingle()
    if (!membership) return NextResponse.json({ error: "Cohort not found." }, { status: 404 })
    const { data: cohort } = await supabase.from("career_cohorts").select("id, name, code, description, is_active").eq("id", id).maybeSingle()
    if (!cohort) return NextResponse.json({ error: "Cohort not found." }, { status: 404 })
    const memberQuery = membership.role === "instructor"
      ? supabase.from("career_cohort_members").select("user_id, role, joined_at").eq("cohort_id", id)
      : supabase.from("career_cohort_members").select("user_id, role, joined_at").eq("cohort_id", id).eq("user_id", user.id)
    const { data: members } = await memberQuery
    const userIds = (members || []).map((member) => member.user_id)
    if (!userIds.length) return NextResponse.json({ cohort, role: membership.role, members: [] })
    const [{ data: users }, { data: usage }, { data: profiles }, { data: resumes }] = await Promise.all([
      supabase.from("users").select("id, full_name, email").in("id", userIds),
      supabase.from("career_usage").select("*").in("user_id", userIds).order("period_start", { ascending: false }),
      supabase.from("career_profiles").select("user_id, target_role").in("user_id", userIds),
      supabase.from("resume_documents").select("user_id, ats_score, updated_at").in("user_id", userIds).neq("status", "archived"),
    ])
    const rows = (members || []).map((member) => ({
      userId: member.user_id,
      role: member.role,
      joinedAt: member.joined_at,
      name: users?.find((item) => item.id === member.user_id)?.full_name || "Learner",
      email: membership.role === "instructor" ? users?.find((item) => item.id === member.user_id)?.email : undefined,
      targetRole: profiles?.find((item) => item.user_id === member.user_id)?.target_role || "",
      usage: usage?.find((item) => item.user_id === member.user_id) || null,
      bestResumeScore: Math.max(0, ...(resumes || []).filter((item) => item.user_id === member.user_id).map((item) => item.ats_score || 0)),
    }))
    return NextResponse.json({ cohort, role: membership.role, members: rows })
  })(request)
}
