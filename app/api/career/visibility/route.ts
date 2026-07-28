import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/plan-limits-v2"
import { authorizeRole } from "@/lib/server/roles"
import { normalizeLinkedInUrl } from "@/lib/validation"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  isSearchable: z.boolean(),
  publicName: z.string().trim().max(160).default(""),
  professionalHeadline: z.string().trim().max(300).default(""),
  targetRoles: z.array(z.string().trim().max(120)).max(10).default([]),
  locations: z.array(z.string().trim().max(120)).max(10).default([]),
  skills: z.array(z.string().trim().max(120)).max(30).default([]),
  yearsExperience: z.number().int().min(0).max(60).nullable().default(null),
  linkedinUrl: z.string().trim().max(300).default(""),
  contactEmail: z.string().email().max(250).or(z.literal("")).default(""),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { data, error } = await createServiceClient().from("candidate_visibility").select("*").eq("workspace_id", planCheck.workspaceId).maybeSingle()
    if (error) return NextResponse.json({ error: "Visibility settings could not be loaded." }, { status: 500 })
    return NextResponse.json({ visibility: data })
  })(request)
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the visibility fields." }, { status: 400 })
    const input = parsed.data
    const linkedinUrl = input.linkedinUrl ? normalizeLinkedInUrl(input.linkedinUrl) : ""
    if (linkedinUrl === null) return NextResponse.json({ error: "Use a valid public LinkedIn profile URL." }, { status: 400 })
    const { error } = await createServiceClient().from("candidate_visibility").upsert({
      workspace_id: planCheck.workspaceId,
      user_id: user.id,
      is_searchable: input.isSearchable,
      public_name: input.publicName,
      professional_headline: input.professionalHeadline,
      target_roles: input.targetRoles,
      locations: input.locations,
      skills: input.skills,
      years_experience: input.yearsExperience,
      linkedin_url: linkedinUrl || null,
      contact_email: input.contactEmail || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" })
    if (error) return NextResponse.json({ error: "Visibility settings could not be saved." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
