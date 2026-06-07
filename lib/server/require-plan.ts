import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId, fetchWorkspacePlan, getWorkspaceSessionContext } from "@/lib/server/workspace"
import { canAccessPlan } from "@/lib/entitlements"
import { getPlanLimits, type PlanLimits, type PlanTier } from "@/lib/entitlements"
import { supabaseSelect } from "@/lib/server/supabase-rest"

type PlanCheckResult =
  | {
      ok: true
      session: Awaited<ReturnType<typeof getWorkspaceSessionContext>>
      workspaceId: string
      plan: string
      status: string
      limits: PlanLimits
      overrideActive: boolean
      planExpired: boolean
    }
  | { ok: false; response: NextResponse }

/**
 * Core enforcement middleware. Validates auth session, resolves workspace, checks plan hierarchy.
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

  const planInfo = await fetchWorkspacePlan(workspaceId, session.email)
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
    plan: effectivePlan,
    status: planInfo.status,
    limits: planInfo.limits || getPlanLimits(effectivePlan),
    overrideActive: Boolean(planInfo.overrideActive),
    planExpired: Boolean(planInfo.planExpired),
  }
}

export const getMonthlyCount = async (
  table: string,
  workspaceId: string,
  filterField = "workspace_id"
): Promise<number> => {
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
