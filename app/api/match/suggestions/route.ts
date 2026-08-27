import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { ensureSuggestions, hasActiveMatchConsent, listSuggestions, loadMatchProfile } from "@/lib/server/matching"

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const [profile, consented] = await Promise.all([
      loadMatchProfile(planCheck.workspaceId),
      hasActiveMatchConsent(user.id),
    ])
    if (!profile?.opted_in || !consented) return NextResponse.json({ optedIn: false, suggestions: [] })

    try {
      await ensureSuggestions(user.id, planCheck.workspaceId)
      return NextResponse.json({ optedIn: true, suggestions: await listSuggestions(user.id) })
    } catch (error) {
      // Migration not applied yet degrades to an empty week rather than a 500.
      if (error instanceof Error && error.message === "schema_not_applied") {
        return NextResponse.json({ optedIn: true, suggestions: [] })
      }
      return NextResponse.json({ error: "Matches could not be loaded." }, { status: 500 })
    }
  })(request)
}
