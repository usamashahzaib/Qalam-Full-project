import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { normalizeLinkedInUrl } from "@/lib/validation"
import { MATCH_CONSENT_PURPOSE, MATCH_DOMAIN, MATCH_POLICY_VERSION } from "@/lib/server/matching"

const tags = (max: number) => z.array(z.string().trim().min(1).max(120)).max(max).default([])

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  optedIn: z.boolean(),
  displayName: z.string().trim().max(160).default(""),
  headline: z.string().trim().max(300).default(""),
  industry: z.string().trim().max(120).default(""),
  seniority: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  expertise: tags(12),
  audience: tags(12),
  goals: tags(8),
  contactEmail: z.string().email().max(250).or(z.literal("")).default(""),
  linkedinUrl: z.string().trim().max(300).default(""),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("match_profiles")
      .select("*")
      .maybeSingle()
    if (error) return NextResponse.json({ error: "Match profile could not be loaded." }, { status: 500 })
    return NextResponse.json({ profile: data })
  })(request)
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the match profile fields." }, { status: 400 })
    const input = parsed.data

    const linkedinUrl = input.linkedinUrl ? normalizeLinkedInUrl(input.linkedinUrl) : ""
    if (linkedinUrl === null) return NextResponse.json({ error: "Use a valid public LinkedIn profile URL." }, { status: 400 })

    // Opting in publishes a profile to other members, so it needs enough on it to
    // be scoreable. Without expertise and audience the engine has nothing to match.
    if (input.optedIn && (!input.expertise.length || !input.audience.length)) {
      return NextResponse.json(
        { error: "Add at least one area of expertise and one audience before turning matching on." },
        { status: 400 }
      )
    }

    const supabase = createScopedClient(planCheck.workspaceId)
    const now = new Date().toISOString()
    const { error } = await supabase.from("match_profiles").upsert(
      {
        user_id: user.id,
        domain: MATCH_DOMAIN,
        opted_in: input.optedIn,
        display_name: input.displayName,
        headline: input.headline,
        industry: input.industry,
        seniority: input.seniority,
        location: input.location,
        expertise: input.expertise,
        audience: input.audience,
        goals: input.goals,
        contact_email: input.contactEmail || null,
        linkedin_url: linkedinUrl || null,
        updated_at: now,
      },
      { onConflict: "workspace_id" }
    )
    if (error) return NextResponse.json({ error: "Match profile could not be saved." }, { status: 500 })

    await supabase.from("career_consents").upsert(
      {
        user_id: user.id,
        purpose: MATCH_CONSENT_PURPOSE,
        granted: input.optedIn,
        policy_version: MATCH_POLICY_VERSION,
        granted_at: input.optedIn ? now : null,
        revoked_at: input.optedIn ? null : now,
        updated_at: now,
      },
      { onConflict: "user_id,purpose" }
    )

    return NextResponse.json({ success: true })
  })(request)
}
