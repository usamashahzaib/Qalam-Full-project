import { NextRequest, NextResponse } from "next/server"
import { fetchWorkspacePlan, requireAdminOps } from "@/lib/server/workspace"
import { getMonthlyCount } from "@/lib/server/require-plan"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import { resolvePlanExpiry } from "@/lib/plan-expiry"

type UserRow = { id: string; email: string; full_name: string | null; image_url: string | null; external_user_id: string | null; plan_expires_at: string | null; created_at: string | null }
type MembershipRow = { user_id: string; workspace_id: string | null }
type OverrideRow = { user_id: string; plan_override: string | null; draft_limit_override: number | null; workspace_limit_override: number | null; feature_flags: Record<string, boolean> | null; notes: string | null; expires_at: string | null }
type AuditRow = { id: string; admin_email: string; target_user_email: string; action: string; old_value: unknown; new_value: unknown; created_at: string }
type PaymentRow = { user_id: string; created_at: string | null; processed_at: string | null }
type UsageRow = {
  user_id: string
  ai_drafts_used: number | null
  carousels_used: number | null
  hooks_used: number | null
  analyses_used: number | null
  competitor_runs_used: number | null
  comment_generations_used: number | null
}

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const params = new URL(request.url).searchParams
  const rawQ = (params.get("search") || params.get("q") || "").trim().toLowerCase()
  // encodeURIComponent does not escape PostgREST filter syntax metacharacters
  // ( ) , * - strip them so a search term can't inject extra or/and clauses.
  const q = rawQ.replace(/[(),*]/g, "")
  const page = Math.max(1, parseInt(params.get("page") || "1", 10))
  const pageSize = Math.min(25, Math.max(1, parseInt(params.get("limit") || "25", 10)))
  const offset = (page - 1) * pageSize
  // Push search filter into SQL so pagination applies AFTER filtering
  const searchFilter = q ? `&or=(email.ilike.*${encodeURIComponent(q)}*,full_name.ilike.*${encodeURIComponent(q)}*)` : ""
  const users = await supabaseSelect<UserRow>("users", `select=id,email,full_name,image_url,external_user_id,plan_expires_at,created_at&order=email.asc&limit=${pageSize}&offset=${offset}${searchFilter}`).catch(() => [])
  const filtered = users
  const userIds = filtered.map((user) => user.id)
  const memberships = userIds.length
    ? await supabaseSelect<MembershipRow>("workspace_members", `user_id=in.(${userIds.join(",")})&select=user_id,workspace_id`).catch(() => [])
    : []
  const overrides = userIds.length
    ? await supabaseSelect<OverrideRow>("user_overrides", `user_id=in.(${userIds.join(",")})&select=user_id,plan_override,draft_limit_override,workspace_limit_override,feature_flags,notes,expires_at`).catch(() => [])
    : []
  const payments = userIds.length
    ? await supabaseSelect<PaymentRow>("payments", `user_id=in.(${userIds.join(",")})&status=eq.paid&select=user_id,created_at,processed_at&order=created_at.desc`).catch(() => [])
    : []
  const externalIds = filtered.map((user) => user.external_user_id).filter(Boolean) as string[]
  const usageLookupIds = [...new Set([...userIds, ...externalIds])]
  const usageRows = usageLookupIds.length
    ? await supabaseSelect<UsageRow>("plan_usage", `user_id=in.(${usageLookupIds.join(",")})&select=user_id,ai_drafts_used,carousels_used,hooks_used,analyses_used,competitor_runs_used,comment_generations_used`).catch(() => [])
    : []

  const enriched = await Promise.all(filtered.map(async (user) => {
    const workspaceIds = memberships.filter((row) => row.user_id === user.id && row.workspace_id).map((row) => row.workspace_id as string)
    const primaryWorkspaceId = workspaceIds[0] || ""
    const planInfo = primaryWorkspaceId ? await fetchWorkspacePlan(primaryWorkspaceId, user.email) : null
    const draftsUsed = (await Promise.all(workspaceIds.map((workspaceId) => getMonthlyCount("posts", workspaceId)))).reduce((sum, count) => sum + count, 0)
    // externalId is what plan_usage and user_overrides use as the key
    const externalId = user.external_user_id || user.id
    const payment = payments.find((row) => row.user_id === user.id)
    const usageRow = usageRows.find((row) => row.user_id === user.id || row.user_id === externalId) || null
    return {
      id: user.id,
      externalId,
      name: user.full_name || user.email.split("@")[0],
      email: user.email,
      linkedInId: user.external_user_id || "",
      currentPlan: planInfo?.plan || "Free",
      planExpiresAt: resolvePlanExpiry(planInfo?.expiresAt || user.plan_expires_at, payment?.processed_at || payment?.created_at || user.created_at),
      draftsUsed,
      workspaces: workspaceIds.length,
      override: overrides.find((o) => o.user_id === user.id || o.user_id === externalId) || null,
      usage: {
        aiDraftsUsed: usageRow?.ai_drafts_used ?? 0,
        carouselsUsed: usageRow?.carousels_used ?? 0,
        hooksUsed: usageRow?.hooks_used ?? 0,
        analysesUsed: usageRow?.analyses_used ?? 0,
        competitorRunsUsed: usageRow?.competitor_runs_used ?? 0,
        commentGenerationsUsed: usageRow?.comment_generations_used ?? 0,
      },
    }
  }))

  const auditLog = await supabaseSelect<AuditRow>(
    "admin_audit_log",
    "select=id,admin_email,target_user_email,action,old_value,new_value,created_at&order=created_at.desc&limit=50"
  ).catch(() => [])

  return NextResponse.json({ users: enriched, auditLog, page, pageSize })
}
