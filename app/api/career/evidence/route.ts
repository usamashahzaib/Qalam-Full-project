import { NextRequest, NextResponse } from "next/server"
import { evidenceSchema } from "@/lib/career-outcomes"
import { getCareerEntitlements } from "@/lib/career-entitlements"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { data, error } = await createScopedClient(planCheck.workspaceId).from("career_evidence").select("*").order("updated_at", { ascending: false })
    if (error) return NextResponse.json({ error: "Evidence could not be loaded." }, { status: 500 })
    return NextResponse.json({ evidence: data || [], entitlements: getCareerEntitlements(planCheck.plan) })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const parsed = evidenceSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the evidence fields.", details: parsed.error.flatten() }, { status: 400 })
    const entitlements = getCareerEntitlements(planCheck.plan)
    if (entitlements.evidenceItems !== "unlimited") {
      const { count, error: countError } = await createScopedClient(planCheck.workspaceId).from("career_evidence").select("id", { count: "exact", head: true })
      if (countError) return NextResponse.json({ error: "Evidence limit could not be checked." }, { status: 500 })
      if ((count || 0) >= entitlements.evidenceItems) return NextResponse.json({ error: "evidence_limit", limit: entitlements.evidenceItems, upgradeTo: "Solo" }, { status: 403 })
    }
    const input = parsed.data
    const { data, error } = await createScopedClient(planCheck.workspaceId).from("career_evidence").insert({
      user_id: user.id,
      evidence_type: input.evidenceType,
      title: input.title,
      summary: input.summary,
      source_url: input.sourceUrl || null,
      issuer: input.issuer || null,
      occurred_on: input.occurredOn || null,
      skills: input.skills,
      metrics: input.metrics,
      verification_status: input.sourceUrl ? "documented" : "self_reported",
    }).select("*").single()
    if (error) return NextResponse.json({ error: "Evidence could not be saved." }, { status: 500 })
    return NextResponse.json({ evidence: data }, { status: 201 })
  })(request)
}
