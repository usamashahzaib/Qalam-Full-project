import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { errorToStatus } from "@/lib/server/roles"
import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"
import { checkWorkspaceUsage } from "@/lib/server/workspace-usage"
import { getCanonicalPlan } from "@/lib/server/plan-limits-v2"
import { getPlanLimits } from "@/lib/entitlements"

const createClientSchema = z.object({
  clientName: z.string().trim().min(2).max(100),
  primaryContactName: z.string().trim().max(100).optional().default(""),
  primaryContactEmail: z.union([z.literal(""), z.string().trim().email().max(254)]).optional().default(""),
})

type WorkspaceRow = {
  id: string
  name: string
  created_at: string
  owner_id: string | null
  branding_color: string | null
  archived_at: string | null
  workspace_type: "personal" | "client"
  client_contact_name: string | null
  client_contact_email: string | null
}

const isManager = (role: string) => role === "owner" || role === "admin"

export async function GET() {
  try {
    const ctx = await getWorkspaceSessionContext()
    const dbUserId = ctx.supabaseUserId

    const [memberships, accountPlan] = await Promise.all([
      supabaseSelect<{ workspace_id: string | null; role: string }>(
        "workspace_members",
        `user_id=eq.${encodeURIComponent(dbUserId)}&select=workspace_id,role`
      ),
      getCanonicalPlan(dbUserId),
    ])

    const workspaceIds = [...new Set((memberships || []).map((membership) => membership.workspace_id).filter(Boolean))] as string[]
    const limits = getPlanLimits(accountPlan)
    const canCreate = accountPlan === "Agency"
    const workspaceLimit = canCreate ? limits.clientWorkspaces : 0

    if (!workspaceIds.length) {
      return NextResponse.json({
        clients: [],
        access: { accountPlan, canCreate, ownedClientCount: 0, workspaceLimit },
      })
    }

    const workspaces = await supabaseSelect<WorkspaceRow>(
      "workspaces",
      `id=in.(${workspaceIds.map(encodeURIComponent).join(",")})&workspace_type=eq.client&select=id,name,created_at,owner_id,branding_color,archived_at,workspace_type,client_contact_name,client_contact_email`
    )

    const roleByWorkspace = new Map((memberships || []).map((membership) => [membership.workspace_id, membership.role]))
    const visibleWorkspaces = (workspaces || []).filter((workspace) => {
      const role = roleByWorkspace.get(workspace.id) ?? "viewer"
      return workspace.owner_id === dbUserId || isManager(role)
    })
    const ownedClientCount = visibleWorkspaces.filter((workspace) => workspace.owner_id === dbUserId).length

    const ownerIds = [...new Set(visibleWorkspaces.map((workspace) => workspace.owner_id).filter(Boolean))] as string[]
    const ownerPlans: Record<string, { plan: string; expiresAt: string | null }> = {}
    if (ownerIds.length) {
      const users = await supabaseSelect<{ id: string; plan_expires_at: string | null }>(
        "users",
        `id=in.(${ownerIds.map(encodeURIComponent).join(",")})&select=id,plan_expires_at`
      ).catch(() => [])
      const expiryByOwner = new Map((users || []).map((user) => [user.id, user.plan_expires_at]))
      await Promise.all(ownerIds.map(async (ownerId) => {
        ownerPlans[ownerId] = {
          plan: await getCanonicalPlan(ownerId).catch(() => "Free"),
          expiresAt: expiryByOwner.get(ownerId) ?? null,
        }
      }))
    }

    const allMembers = visibleWorkspaces.length
      ? await supabaseSelect<{ workspace_id: string }>(
          "workspace_members",
          `workspace_id=in.(${visibleWorkspaces.map((workspace) => encodeURIComponent(workspace.id)).join(",")})&select=workspace_id`
        ).catch(() => [])
      : []
    const memberCounts = new Map<string, number>()
    for (const row of allMembers || []) {
      memberCounts.set(row.workspace_id, (memberCounts.get(row.workspace_id) ?? 0) + 1)
    }

    const usageByWorkspace = new Map(
      await Promise.all(
        visibleWorkspaces.map(async (workspace) => [
          workspace.id,
          await checkWorkspaceUsage(workspace.id, "drafts").catch(() => null),
        ] as const)
      )
    )

    const clients = visibleWorkspaces
      .map((workspace) => {
        const role = roleByWorkspace.get(workspace.id) ?? "viewer"
        const usage = usageByWorkspace.get(workspace.id)
        const ownerPlan = workspace.owner_id ? ownerPlans[workspace.owner_id] : null
        return {
          id: workspace.id,
          client_name: workspace.name,
          clientContactName: workspace.client_contact_name,
          clientContactEmail: workspace.client_contact_email,
          status: workspace.archived_at ? "archived" : "active",
          plan: ownerPlan?.plan ?? "Free",
          role,
          canManage: isManager(role),
          isAgencyOwner: workspace.owner_id === dbUserId,
          created_at: workspace.created_at,
          planExpiresAt: ownerPlan?.expiresAt ?? null,
          brandingColor: workspace.branding_color,
          teamCount: memberCounts.get(workspace.id) ?? 0,
          draftsUsed: usage?.used ?? 0,
          draftsLimit: usage?.limit ?? null,
        }
      })
      .sort((a, b) => Number(a.status === "archived") - Number(b.status === "archived") || a.client_name.localeCompare(b.client_name))

    return NextResponse.json({
      clients,
      access: { accountPlan, canCreate, ownedClientCount, workspaceLimit },
    })
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getWorkspaceSessionContext()
    const dbUserId = ctx.supabaseUserId
    const accountPlan = await getCanonicalPlan(dbUserId)
    const limits = getPlanLimits(accountPlan)
    if (accountPlan !== "Agency" || limits.clientWorkspaces === 0) {
      return NextResponse.json(
        { error: "upgrade_required", requiredPlan: "Agency", currentPlan: accountPlan },
        { status: 403 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const parsed = createClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: workspaceId, error } = await supabase.rpc("create_client_workspace_with_limit", {
      p_user_id: dbUserId,
      p_name: parsed.data.clientName,
      p_client_contact_name: parsed.data.primaryContactName || null,
      p_client_contact_email: parsed.data.primaryContactEmail || null,
      p_max_clients: limits.clientWorkspaces === "unlimited" ? null : limits.clientWorkspaces,
    })
    if (error || !workspaceId) {
      const message = error?.message || "workspace_create_failed"
      if (message.includes("client_workspace_limit_reached")) {
        return NextResponse.json(
          { error: "workspace_limit_reached", featureName: "clientWorkspaces", limit: limits.clientWorkspaces },
          { status: 403 }
        )
      }
      throw new Error(message)
    }

    const workspaces = await supabaseSelect<WorkspaceRow>(
      "workspaces",
      `id=eq.${encodeURIComponent(String(workspaceId))}&select=id,name,created_at,owner_id,branding_color,archived_at,workspace_type,client_contact_name,client_contact_email&limit=1`
    )
    const workspace = workspaces?.[0]
    if (!workspace) throw new Error("workspace_create_failed")

    return NextResponse.json({
      client: {
        id: workspace.id,
        client_name: workspace.name,
        clientContactName: workspace.client_contact_name,
        clientContactEmail: workspace.client_contact_email,
        status: "active",
        plan: accountPlan,
        role: "owner",
        canManage: true,
        isAgencyOwner: true,
        created_at: workspace.created_at,
        planExpiresAt: null,
        brandingColor: null,
        teamCount: 1,
        draftsUsed: 0,
        draftsLimit: 60,
      },
    }, { status: 201 })
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }
}
