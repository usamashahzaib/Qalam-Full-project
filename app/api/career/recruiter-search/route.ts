import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const supabase = createServiceClient()
    const { data: membership } = await supabase.from("career_organization_members").select("organization_id, organization:career_organizations(verification_status,organization_type)").eq("user_id", user.id).limit(1).maybeSingle()
    const organization = Array.isArray(membership?.organization) ? membership.organization[0] : membership?.organization
    if (!membership || organization?.verification_status !== "verified" || !["employer", "recruiter"].includes(organization.organization_type)) {
      return NextResponse.json({ error: "verified_recruiter_required", message: "Submit and verify an employer or recruiter workspace before searching candidates." }, { status: 403 })
    }
    const query = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100) || ""
    const { data, error } = await supabase
      .from("candidate_visibility")
      .select("workspace_id, public_name, professional_headline, target_roles, locations, skills, years_experience, linkedin_url, updated_at")
      .eq("is_searchable", true)
      .order("updated_at", { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: "Candidate search is unavailable." }, { status: 500 })
    const needle = query.toLocaleLowerCase()
    const candidates = (data || []).filter((candidate) => !needle || [candidate.public_name, candidate.professional_headline, ...(candidate.target_roles || []), ...(candidate.locations || []), ...(candidate.skills || [])].some((value) => String(value || "").toLocaleLowerCase().includes(needle))).slice(0, 30)
    return NextResponse.json({ candidates })
  })(request)
}
