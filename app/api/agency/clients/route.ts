import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { errorToStatus } from "@/lib/server/roles"
import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const ctx = await getWorkspaceSessionContext()
    const dbUserId = ctx.supabaseUserId

    const memberships = await supabaseSelect<{
      workspace_id: string | null
      role: string
    }>("workspace_members", `user_id=eq.${encodeURIComponent(dbUserId)}&select=workspace_id,role`)

    const workspaceIds = (memberships || []).map((m) => m.workspace_id).filter(Boolean) as string[]
    if (!workspaceIds.length) return NextResponse.json({ clients: [] })
    const workspaces = await supabaseSelect<{
      id: string
      name: string
      created_at: string
    }>("workspaces", `id=in.(${workspaceIds.join(",")})&select=id,name,created_at`)

    const clients = (workspaces || [])
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
    await requireAuth()
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

    const client = ws
      ? {
          id: ws.id,
          client_name: ws.name,
          status: "active",
          plan: "Standard",
          role: "admin",
          created_at: ws.created_at,
        }
      : null

    return NextResponse.json({ client })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
