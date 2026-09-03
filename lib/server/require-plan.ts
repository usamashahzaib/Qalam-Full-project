import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId, resolveEffectivePlan, getWorkspaceSessionContext, resolveWorkspaceBillingPrincipal } from "@/lib/server/workspace"
import { canAccessPlan } from "@/lib/entitlements"
import { getPlanLimits, type PlanLimits, type PlanTier } from "@/lib/entitlements"
import { supabaseCount } from "@/lib/server/supabase-rest"
import { getPlanStatus } from "./plan-limits-v2"

type PlanCheckResult =
  | {
      ok: true
      session: Awaited<ReturnType<typeof getWorkspaceSessionContext>>
      workspaceId: string
      billingUserId: string
      plan: string
      status: string
      limits: PlanLimits
      isActive: boolean
      expiresAt: string | null
      renewalDue: boolean
      daysUntilExpiry: number | null
      overrideActive: boolean
      planExpired: boolean
    }
  | { ok: false; response: NextResponse }

/**
 * Core enforcement middleware. Validates auth session, resolves workspace,
 * checks plan hierarchy. Single resolution path: getPlanStatus() for expiry /
 * override state, resolveEffectivePlan() for workspace-owner inheritance.
 * No duplicate expiry calculations.
 */
export const requirePlan = async (
  request: NextRequest,
  requiredPlan: PlanTier,
  explicitWorkspaceId?: string
): Promise<PlanCheckResult> => {
  const userId = await requireAuth().catch(() => null)
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "auth_required" }, { status: 401 }) }
  }

  let session: Awaited<ReturnType<typeof getWorkspaceSessionContext>>
  try {
    session = await getWorkspaceSessionContext()
  } catch {
    return { ok: false, response: NextResponse.json({ error: "auth_required" }, { status: 401 }) }
  }

  let workspaceId: string
  try {
    workspaceId = await resolveWorkspaceId(request, explicitWorkspaceId)
  } catch (err) {
    const msg = (err as Error).message || "server_error"
    const status = (msg === "auth_required" || msg === "Unauthorized") ? 401 : msg === "unauthorized_workspace" ? 403 : 500
    return { ok: false, response: NextResponse.json({ error: msg }, { status }) }
  }

  const billingPrincipal = await resolveWorkspaceBillingPrincipal(
    workspaceId,
    session.supabaseUserId,
    session.email,
  )

  // Single resolution path: getPlanStatus owns expiry/override data;
  // resolveEffectivePlan owns workspace-owner plan inheritance.
  // Run both in parallel - they use independent DB queries.
  const [planStatus, planInfo] = await Promise.all([
    getPlanStatus(billingPrincipal.userId),
    resolveEffectivePlan(workspaceId, billingPrincipal.email, billingPrincipal.userId),
  ])

  // Respect admin override: an override can reactivate an otherwise-expired plan.
  if (!planStatus.isActive && !planInfo.overrideActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "plan_expired", message: "Your plan has expired. Please renew to continue." },
        { status: 403 }
      ),
    }
  }

  const effectivePlan = planInfo.plan

  if (!canAccessPlan(effectivePlan, requiredPlan)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "upgrade_required", requiredPlan, currentPlan: effectivePlan },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    session,
    workspaceId,
    billingUserId: billingPrincipal.userId,
    plan: effectivePlan,
    status: planInfo.status,
    limits: getPlanLimits(effectivePlan),
    isActive: planStatus.isActive,
    expiresAt: planStatus.expiresAt,
    renewalDue: planStatus.renewalDue,
    daysUntilExpiry: planStatus.daysUntilExpiry,
    overrideActive: Boolean(planInfo.overrideActive),
    planExpired: Boolean(planInfo.planExpired),
  }
}

const ALLOWED_COUNT_TABLES = new Set([
  "posts", "carousels", "hooks", "voice_profiles", "analytics_snapshots",
  "ai_usage", "competitor_analyses", "workspace_members",
])

export const getMonthlyCount = async (
  table: string,
  workspaceId: string,
  filterField = "workspace_id"
): Promise<number> => {
  if (!ALLOWED_COUNT_TABLES.has(table)) {
    throw new Error(`getMonthlyCount: table '${table}' is not in the allowed list`)
  }

  // Anchored to UTC explicitly (not setDate/setHours, which operate in the
  // host's local timezone) so "start of month" is identical regardless of
  // which timezone the serverless instance happens to be running in.
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const isoStart = startOfMonth.toISOString()

  return supabaseCount(
    table,
    `${filterField}=eq.${workspaceId}&created_at=gte.${isoStart}&select=id`
  )
}

export const enforceMonthlyLimit = (
  current: number,
  limit: number | "unlimited",
  featureName: string
): NextResponse | null => {
  if (limit === "unlimited") return null
  if (current >= limit) {
    return NextResponse.json(
      { error: "monthly_limit_reached", featureName, limit, current },
      { status: 403 }
    )
  }
  return null
}
