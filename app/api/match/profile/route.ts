import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient, createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { normalizeLinkedInUrl } from "@/lib/validation"
import { MATCH_DOMAIN, MATCH_POLICY_VERSION } from "@/lib/server/matching"
import { buildMatchProfileDraft } from "@/lib/match-profile-prefill"

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
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const scoped = createScopedClient(planCheck.workspaceId)
    const [matchResult, vaultResult, profileResult] = await Promise.all([
      scoped.from("match_profiles").select("*").maybeSingle(),
      scoped
        .from("career_profiles")
        .select("target_role,target_industry,location,skills,career_goals")
        .maybeSingle(),
      createServiceClient()
        .from("voice_profiles")
        .select("name,title,industry,linkedin_url,goals,characteristics")
        .or(`workspace_id.eq.${planCheck.workspaceId},and(workspace_id.is.null,user_id.eq.${user.id})`)
        .limit(1)
        .maybeSingle(),
    ])

    if (matchResult.error) return NextResponse.json({ error: "Match profile could not be loaded." }, { status: 500 })

    const { draft, sources } = buildMatchProfileDraft({
      saved: matchResult.data as unknown as Record<string, unknown> | null,
      careerVault: vaultResult.error ? null : vaultResult.data as unknown as Record<string, unknown> | null,
      profile: profileResult.error ? null : profileResult.data,
    })

    return NextResponse.json({
      profile: matchResult.data,
      draft,
      prefillSources: sources,
    })
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

    const now = new Date().toISOString()
    const { error } = await createServiceClient().rpc("save_match_profile_v1", {
      p_workspace_id: planCheck.workspaceId,
      p_user_id: user.id,
      p_domain: MATCH_DOMAIN,
      p_opted_in: input.optedIn,
      p_display_name: input.displayName,
      p_headline: input.headline,
      p_industry: input.industry,
      p_seniority: input.seniority,
      p_location: input.location,
      p_expertise: input.expertise,
      p_audience: input.audience,
      p_goals: input.goals,
      p_contact_email: input.contactEmail,
      p_linkedin_url: linkedinUrl,
      p_policy_version: MATCH_POLICY_VERSION,
      p_updated_at: now,
    })
    if (error) return NextResponse.json({ error: "Match profile could not be saved." }, { status: 500 })

    return NextResponse.json({ success: true })
  })(request)
}
