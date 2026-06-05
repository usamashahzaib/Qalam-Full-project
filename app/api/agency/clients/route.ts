import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getClerkAuthContext } from "@/lib/server/workspace"
import { errorToStatus } from "@/lib/server/roles"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    const ctx = await getClerkAuthContext()
    const dbUserId = ctx.supabaseUserId

    const memberships = await supabaseSelect<{
      workspace_id: string | null
      organization_id: string
      role: string
    }>("memberships", `user_id=eq.${dbUserId}`)

    const orgIds = Array.from(
      new Set((memberships || []).map((m) => m.organization_id).filter(Boolean))
    )
    if (orgIds.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    const workspaces = await supabaseSelect<{
      id: string
      name: string
      organization_id: string
      created_at: string
    }>("workspaces", `organization_id=in.(${orgIds.join(",")})`)

    const memberWorkspaceIds = new Set(
      (memberships || []).map((m) => m.workspace_id).filter(Boolean)
    )

    const clients = (workspaces || [])
      .filter((ws) => memberWorkspaceIds.has(ws.id))
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
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    const ctx = await getClerkAuthContext()
    const dbUserId = ctx.supabaseUserId

    const memberships = await supabaseSelect<{
      organization_id: string
      workspace_id: string | null
      role: string
    }>("memberships", `user_id=eq.${dbUserId}`)

    const orgMembership = (memberships || []).find((m) => !m.workspace_id) || (memberships || [])[0]
    const orgId = orgMembership?.organization_id
    if (!orgId) return NextResponse.json({ error: "no_organization" }, { status: 403 })

    const orgRole = orgMembership?.role ?? "viewer"
    if (!["agency_admin", "super_admin", "editor"].includes(orgRole)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

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
      await supabaseInsert(
        "memberships",
        {
          user_id: dbUserId,
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
