import { NextRequest, NextResponse } from "next/server"
import { consentSchema } from "@/lib/career-outcomes"
import { withAuth } from "@/lib/server/auth"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"

const purposeMap = {
  recruiterDiscovery: "recruiter_discovery",
  outcomeLearning: "outcome_learning",
  partnerReporting: "partner_reporting",
} as const

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError
    const { data, error } = await createScopedClient(planCheck.workspaceId).from("career_consents").select("purpose,granted,updated_at")
    if (error) return NextResponse.json({ error: "Privacy choices could not be loaded." }, { status: 500 })
    const rows = data as unknown as { purpose: string; granted: boolean }[] | null
    const consents = Object.fromEntries(Object.entries(purposeMap).map(([key, purpose]) => [key, Boolean(rows?.find((item) => item.purpose === purpose)?.granted)]))
    return NextResponse.json({ consents, policyVersion: "2026-08-17" })
  })(request)
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const parsed = consentSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the privacy choices." }, { status: 400 })
    const now = new Date().toISOString()
    const rows = Object.entries(purposeMap).map(([key, purpose]) => {
      const granted = parsed.data[key as keyof typeof purposeMap]
      return { user_id: user.id, purpose, granted, policy_version: "2026-08-17", granted_at: granted ? now : null, revoked_at: granted ? null : now, updated_at: now }
    })
    const { error } = await createScopedClient(planCheck.workspaceId).from("career_consents").upsert(rows, { onConflict: "user_id,purpose" })
    if (error) return NextResponse.json({ error: "Privacy choices could not be saved." }, { status: 500 })
    return NextResponse.json({ success: true, consents: parsed.data })
  })(request)
}
