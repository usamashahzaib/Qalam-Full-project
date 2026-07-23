import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { requirePlan } from "@/lib/server/require-plan"
import { errorToStatus } from "@/lib/server/roles"
import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"
import { resolvePlanExpiry } from "@/lib/plan-expiry"
import { checkWorkspaceUsage } from "@/lib/server/workspace-usage"

export async function GET(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Agency")
    if (!planCheck.ok) return planCheck.response
    const ctx = await getWorkspaceSessionContext()
    const dbUserId = ctx.supabaseUserId

    const memberships = await supabaseSelect<{
      workspace_id: string | null
      role: string
    }>("workspace_members", `user_id=eq.${encodeURIComponent(dbUserId)}&select=workspace_id,role`)

    const workspaceIds = (memberships || []).map((m) => m.workspace_id).filter(Boolean) as string[]
    if (!workspaceIds.length) return NextResponse.json({ clients: [] })
    type WorkspaceRow = { id: string; name: string; created_at: string; owner_id: string | null; branding_color: string | null; archived_at: string | null }
    // branding_color/archived_at fall back gracefully if migrations 0057/0058 haven't run yet.
    const workspaces = await supabaseSelect<WorkspaceRow>(
      "workspaces", `id=in.(${workspaceIds.join(",")})&select=id,name,created_at,owner_id,branding_color,archived_at`
    ).catch(async () =>
      (await supabaseSelect<Omit<WorkspaceRow, "branding_color" | "archived_at">>(
        "workspaces", `id=in.(${workspaceIds.join(",")})&select=id,name,created_at,owner_id`
      )).map((ws) => ({ ...ws, branding_color: null, archived_at: null }))
    )

    // Batch-fetch plan for each workspace owner
    const ownerIds = [...new Set((workspaces || []).map((ws) => ws.owner_id).filter(Boolean))] as string[]
    const ownerPlans: Record<string, string> = {}
    if (ownerIds.length > 0) {
      const users = await supabaseSelect<{ id: string; plan: string | null }>(
        "users",
        `id=in.(${ownerIds.map(encodeURIComponent).join(",")})&select=id,plan`
      ).catch(() => [])
      for (const u of users || []) {
        ownerPlans[u.id] = u.plan ?? "Free"
      }
    }

    // Team size per workspace - one query for all workspaces, counted client-side.
    const allMembers = await supabaseSelect<{ workspace_id: string }>(
      "workspace_members",
      `workspace_id=in.(${workspaceIds.join(",")})&select=workspace_id`
    ).catch(() => [])
    const memberCounts = new Map<string, number>()
    for (const row of allMembers || []) {
      memberCounts.set(row.workspace_id, (memberCounts.get(row.workspace_id) ?? 0) + 1)
    }

    // Draft usage per workspace - at most 5 workspaces on the Agency plan, so parallel is fine.
    const usageByWorkspace = new Map(
      await Promise.all(
        (workspaces || []).map(async (ws) => [ws.id, await checkWorkspaceUsage(ws.id, "drafts").catch(() => null)] as const)
      )
    )

    const clients = (workspaces || [])
      .map((ws) => {
        const wsRole = (memberships || []).find((m) => m.workspace_id === ws.id)?.role ?? "viewer"
        const usage = usageByWorkspace.get(ws.id)
        return {
          id: ws.id,
          client_name: ws.name,
          status: ws.archived_at ? "archived" : "active",
          plan: ws.owner_id ? (ownerPlans[ws.owner_id] ?? "Free") : "Free",
          role: wsRole,
          created_at: ws.created_at,
          planExpiresAt: resolvePlanExpiry(null, ws.created_at),
          brandingColor: ws.branding_color,
          teamCount: memberCounts.get(ws.id) ?? 0,
          draftsUsed: usage?.used ?? 0,
          draftsLimit: usage?.limit ?? null,
        }
      })

    return NextResponse.json({ clients })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}

export async function POST(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Agency")
    if (!planCheck.ok) return planCheck.response
    const ctx = await getWorkspaceSessionContext()
    const dbUserId = ctx.supabaseUserId

    const memberships = await supabaseSelect<{
      workspace_id: string | null
      role: string
    }>("workspace_members", `user_id=eq.${encodeURIComponent(dbUserId)}&select=workspace_id,role`)

    const canCreate = (memberships || []).some((m) => ["owner", "admin", "editor"].includes(m.role))
    if (!canCreate) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const limit = planCheck.limits.clientWorkspaces
    const clientCount = Math.max(0, (memberships || []).filter((m) => m.workspace_id).length - 1)
    if (limit !== "unlimited" && clientCount >= limit) {
      return NextResponse.json(
        { error: "workspace_limit_reached", featureName: "clientWorkspaces", limit, current: clientCount },
        { status: 403 }
      )
    }

    const body = await request.json()
    if (!body.clientName) return NextResponse.json({ error: "missing_fields" }, { status: 400 })

    const supabase = createServiceClient()
    const { data: workspaceId, error } = await supabase.rpc("create_workspace_with_member", {
      p_user_id: dbUserId,
      p_name: body.clientName,
      p_role: "admin",
    })
    if (error || !workspaceId) throw new Error(error?.message || "workspace_create_failed")

    const workspaces = await supabaseSelect<{ id: string; name: string; created_at: string }>(
      "workspaces",
      `id=eq.${workspaceId}&select=id,name,created_at&limit=1`
    )
    const ws = workspaces?.[0]

    // Look up current user's plan for the new workspace
    const ownerRows = await supabaseSelect<{ plan: string | null }>(
      "users",
      `id=eq.${encodeURIComponent(dbUserId)}&select=plan&limit=1`
    ).catch(() => [])
    const ownerPlan = ownerRows?.[0]?.plan ?? "Free"

    const client = ws
      ? {
          id: ws.id,
          client_name: ws.name,
          status: "active",
          plan: ownerPlan,
          role: "admin",
          created_at: ws.created_at,
          planExpiresAt: resolvePlanExpiry(null, ws.created_at),
          brandingColor: null,
          teamCount: 1,
          draftsUsed: 0,
          draftsLimit: 60,
        }
      : null

    return NextResponse.json({ client })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
