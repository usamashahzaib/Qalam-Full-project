import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/server/workspace"
import { fetchWorkspacePlan } from "@/lib/server/workspace"
import { getMonthlyCount } from "@/lib/server/require-plan"
import { supabaseSelect } from "@/lib/server/supabase-rest"

type UserRow = { id: string; email: string; full_name: string | null; image_url: string | null }
type MembershipRow = { user_id: string; workspace_id: string | null }
type OverrideRow = { user_id: string; plan_override: string | null; draft_limit_override: number | null; workspace_limit_override: number | null; feature_flags: Record<string, boolean> | null; notes: string | null; expires_at: string | null }
type AuditRow = { id: string; admin_email: string; target_user_email: string; action: string; old_value: unknown; new_value: unknown; created_at: string }

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request)
  } catch {
    return notFound()
  }

  const params = new URL(request.url).searchParams
  const q = (params.get("search") || params.get("q") || "").trim().toLowerCase()
  const users = await supabaseSelect<UserRow>("users", "select=id,email,full_name,image_url&order=email.asc&limit=100").catch(() => [])
  const filtered = q
    ? users.filter((user) => [user.email, user.full_name, user.id].some((value) => String(value || "").toLowerCase().includes(q)))
    : users
  const userIds = filtered.map((user) => user.id)
  const memberships = userIds.length
    ? await supabaseSelect<MembershipRow>("memberships", `user_id=in.(${userIds.join(",")})&select=user_id,workspace_id`).catch(() => [])
    : []
  const overrides = userIds.length
    ? await supabaseSelect<OverrideRow>("user_overrides", `user_id=in.(${userIds.join(",")})&select=user_id,plan_override,draft_limit_override,workspace_limit_override,feature_flags,notes,expires_at`).catch(() => [])
    : []

  const enriched = await Promise.all(filtered.map(async (user) => {
    const workspaceIds = memberships.filter((row) => row.user_id === user.id && row.workspace_id).map((row) => row.workspace_id as string)
    const primaryWorkspaceId = workspaceIds[0] || ""
    const planInfo = primaryWorkspaceId ? await fetchWorkspacePlan(primaryWorkspaceId, user.email) : null
    const draftsUsed = (await Promise.all(workspaceIds.map((workspaceId) => getMonthlyCount("posts", workspaceId)))).reduce((sum, count) => sum + count, 0)
    return {
      id: user.id,
      name: user.full_name || user.email.split("@")[0],
      email: user.email,
      linkedInId: "",
      currentPlan: planInfo?.plan || "Free",
      draftsUsed,
      workspaces: workspaceIds.length,
      override: overrides.find((override) => override.user_id === user.id) || null,
    }
  }))

  const auditLog = await supabaseSelect<AuditRow>(
    "admin_audit_log",
    "select=id,admin_email,target_user_email,action,old_value,new_value,created_at&order=created_at.desc&limit=50"
  ).catch(() => [])

  return NextResponse.json({ users: enriched, auditLog })
}
