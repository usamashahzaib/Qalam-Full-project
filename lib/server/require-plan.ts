import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId, fetchWorkspacePlan, getWorkspaceSessionContext } from "@/lib/server/workspace"
import { canAccessPlan } from "@/lib/entitlements"
import { getPlanLimits, type PlanLimits, type PlanTier } from "@/lib/entitlements"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import { getPlanStatus as getExpiryPlanStatus } from "./plan-expiry"

type PlanCheckResult =
  | {
      ok: true
      session: Awaited<ReturnType<typeof getWorkspaceSessionContext>>
      workspaceId: string
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
 * Core enforcement middleware. Validates auth session, resolves workspace, checks plan hierarchy.
 *
 * Uses fetchWorkspacePlan (workspace-owner's plan) so agency team members correctly
 * inherit the owner's plan tier — not their own Free-tier users.plan record.
 */
export const requirePlan = async (
  request: NextRequest,
  requiredPlan: PlanTier
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
    workspaceId = await resolveWorkspaceId(request)
  } catch (err) {
    const msg = (err as Error).message || "server_error"
    const status = (msg === "auth_required" || msg === "Unauthorized") ? 401 : msg === "unauthorized_workspace" ? 403 : 500
    return { ok: false, response: NextResponse.json({ error: msg }, { status }) }
  }

  const expiryStatus = await getExpiryPlanStatus(session.supabaseUserId)
  if (!expiryStatus.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "plan_expired", message: "Your plan has expired. Please renew to continue." },
        { status: 403 }
      ),
    }
  }

  const planInfo = await fetchWorkspacePlan(workspaceId, session.email)
  const effectivePlan = expiryStatus.plan !== "Free" ? expiryStatus.plan : planInfo.plan

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
    plan: effectivePlan,
    status: planInfo.status,
    limits: planInfo.plan === effectivePlan && planInfo.limits ? planInfo.limits : getPlanLimits(effectivePlan),
    isActive: expiryStatus.isActive,
    expiresAt: expiryStatus.expiresAt,
    renewalDue: expiryStatus.renewalDue,
    daysUntilExpiry: expiryStatus.daysUntilExpiry,
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

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const isoStart = startOfMonth.toISOString()

  try {
    const rows = await supabaseSelect<{ id: string }>(
      table,
      `${filterField}=eq.${workspaceId}&created_at=gte.${isoStart}&select=id`
    )
    return rows?.length ?? 0
  } catch {
    return 0
  }
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
