import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const textList = z.array(z.string().trim().min(1).max(120)).max(40)
const recordList = z.array(z.record(z.string(), z.unknown())).max(30)

const profileSchema = z.object({
  workspaceKey: z.string().uuid().optional(),
  targetRole: z.string().trim().max(120).default(""),
  targetIndustry: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  yearsExperience: z.number().int().min(0).max(60).nullable().default(null),
  summary: z.string().trim().max(3000).default(""),
  skills: textList.default([]),
  achievements: recordList.default([]),
  experiences: recordList.default([]),
  education: recordList.default([]),
  certifications: recordList.default([]),
  careerGoals: z.string().trim().max(2000).default(""),
})

const toClientProfile = (row: Record<string, unknown>) => ({
  targetRole: row.target_role ?? "",
  targetIndustry: row.target_industry ?? "",
  location: row.location ?? "",
  yearsExperience: row.years_experience ?? null,
  summary: row.summary ?? "",
  skills: row.skills ?? [],
  achievements: row.achievements ?? [],
  experiences: row.experiences ?? [],
  education: row.education ?? [],
  certifications: row.certifications ?? [],
  careerGoals: row.career_goals ?? "",
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("career_profiles")
      .select("*")
      .maybeSingle()

    if (error) return NextResponse.json({ error: "Career Vault could not be loaded." }, { status: 500 })
    const row = data as Record<string, unknown> | null
    return NextResponse.json({ profile: row ? toClientProfile(row) : null })
  })(request)
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const body = await req.json().catch(() => null)
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the Career Vault fields.", details: parsed.error.flatten() }, { status: 400 })
    }

    const profile = parsed.data
    const payload = {
      user_id: user.id,
      target_role: profile.targetRole,
      target_industry: profile.targetIndustry,
      location: profile.location,
      years_experience: profile.yearsExperience,
      summary: profile.summary,
      skills: profile.skills,
      achievements: profile.achievements,
      experiences: profile.experiences,
      education: profile.education,
      certifications: profile.certifications,
      career_goals: profile.careerGoals,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("career_profiles")
      .upsert(payload, { onConflict: "workspace_id" })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: "Career Vault could not be saved." }, { status: 500 })
    return NextResponse.json({ profile: toClientProfile(data) })
  })(request)
}
