import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceKey } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

type WorkspaceEvent = {
  id: string
  workspace_key: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const workspaceKey = resolveWorkspaceKey(request)
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 500)
    const query = `workspace_key=eq.${encodeURIComponent(workspaceKey)}&select=*&order=created_at.desc&limit=${limit}`
    const rows = await supabaseSelect<WorkspaceEvent>("workspace_events", query)
    return NextResponse.json({ events: rows || [] })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string
      workspaceKey?: string
      type?: string
      payload?: Record<string, unknown>
      createdAt?: string
    }
    const workspaceKey = resolveWorkspaceKey(request)
    const rows = await supabaseInsert<WorkspaceEvent>("workspace_events", {
      id: body.id || randomUUID(),
      workspace_key: workspaceKey,
      event_type: body.type || "unknown",
      payload: body.payload || {},
      created_at: body.createdAt || new Date().toISOString(),
    })
    return NextResponse.json({ saved: true, event: rows?.[0] || null })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}
