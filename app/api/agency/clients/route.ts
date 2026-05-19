import { NextRequest, NextResponse } from "next/server"
import { getAppSession } from "@/lib/server/app-session"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    const session = getAppSession(request)
    if (!session?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 })

    const users = await supabaseSelect<{ id: string }>(
      "users",
      `email=eq.${encodeURIComponent(session.email)}&limit=1`
    )
    const userId = users?.[0]?.id
    if (!userId) return NextResponse.json({ error: "user_not_found" }, { status: 404 })

    // Fetch all memberships for this user
    const memberships = await supabaseSelect<{
      workspace_id: string | null
      organization_id: string
      role: string
    }>("memberships", `user_id=eq.${userId}`)

    const orgIds = Array.from(
      new Set((memberships || []).map((m) => m.organization_id).filter(Boolean))
    )
    if (orgIds.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    // Fetch all workspaces in these orgs
    const workspaces = await supabaseSelect<{
      id: string
      name: string
      organization_id: string
      created_at: string
    }>("workspaces", `organization_id=in.(${orgIds.join(",")})`)

    // Build a set of workspace IDs the user is explicitly a member of
    const memberWorkspaceIds = new Set(
      (memberships || []).map((m) => m.workspace_id).filter(Boolean)
    )

    const clients = (workspaces || [])
      .filter((ws) => memberWorkspaceIds.has(ws.id)) // only include workspaces user belongs to
      .map((ws) => {
        const wsRole = (memberships || []).find((m) => m.workspace_id === ws.id)?.role ?? "viewer"
        return {
          id: ws.id,
          client_name: ws.name,
          status: "active",
          plan: "Standard",
          role: wsRole,
          created_at: ws.created_at,
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
    const session = getAppSession(request)
    if (!session?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 })

    const users = await supabaseSelect<{ id: string }>(
      "users",
      `email=eq.${encodeURIComponent(session.email)}&limit=1`
    )
    const userId = users?.[0]?.id
    if (!userId) return NextResponse.json({ error: "user_not_found" }, { status: 404 })

    const memberships = await supabaseSelect<{
      organization_id: string
      workspace_id: string | null
      role: string
    }>("memberships", `user_id=eq.${userId}`)

    const orgMembership = (memberships || []).find((m) => !m.workspace_id) // org-level membership
    const orgId = orgMembership?.organization_id
    if (!orgId) return NextResponse.json({ error: "no_organization" }, { status: 403 })

    // ── Role check: must be agency_admin or super_admin to add clients ──────
    // Find the user's org-level role
    const orgRole = orgMembership?.role ?? "viewer"
    if (!["agency_admin", "super_admin"].includes(orgRole)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    // ────────────────────────────────────────────────────────────────────────

    const body = await request.json()
    if (!body.clientName) return NextResponse.json({ error: "missing_fields" }, { status: 400 })

    const result = await supabaseInsert<{ id: string; name: string; created_at: string }>(
      "workspaces",
      {
        organization_id: orgId,
        name: body.clientName,
      },
      "return=representation"
    )

    const ws = result?.[0]

    if (ws) {
      // Auto-assign the creator to this new workspace as agency_admin
      await supabaseInsert(
        "memberships",
        {
          user_id: userId,
          organization_id: orgId,
          workspace_id: ws.id,
          role: "agency_admin",
        },
        "return=minimal"
      )
    }

    const client = ws
      ? {
          id: ws.id,
          client_name: ws.name,
          status: "active",
          plan: "Standard",
          role: "agency_admin",
          created_at: ws.created_at,
        }
      : null

    return NextResponse.json({ client })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
