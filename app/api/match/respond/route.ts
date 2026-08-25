import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { listSuggestions, loadMatchProfile, respondToSuggestion } from "@/lib/server/matching"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  suggestionId: z.string().uuid(),
  action: z.enum(["interested", "passed"]),
})

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the response payload." }, { status: 400 })

    const profile = await loadMatchProfile(planCheck.workspaceId)
    if (!profile?.opted_in) return NextResponse.json({ error: "Turn matching on before responding." }, { status: 403 })

    const result = await respondToSuggestion(user.id, parsed.data.suggestionId, parsed.data.action)
    if (!result.ok) return NextResponse.json({ error: "That match is no longer available." }, { status: 404 })

    return NextResponse.json({
      success: true,
      connected: result.connected,
      suggestions: await listSuggestions(user.id),
    })
  })(request)
}
