import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const query = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100) || ""
    let search = createServiceClient()
      .from("candidate_visibility")
      .select("workspace_id, public_name, professional_headline, target_roles, locations, skills, years_experience, linkedin_url, updated_at")
      .eq("is_searchable", true)
      .order("updated_at", { ascending: false })
      .limit(30)
    if (query) {
      const safe = query.replace(/[%_,()]/g, " ")
      search = search.or(`professional_headline.ilike.%${safe}%,public_name.ilike.%${safe}%`)
    }
    const { data, error } = await search
    if (error) return NextResponse.json({ error: "Candidate search is unavailable." }, { status: 500 })
    return NextResponse.json({ candidates: data || [] })
  })(request)
}
