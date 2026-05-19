import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

type AnalyticsEvent = {
  id: string
  workspace_id: string
  event_type: string
  metrics: Record<string, unknown>
  recorded_at: string
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 500)
    const query = `workspace_id=eq.${workspaceId}&select=*&order=recorded_at.desc&limit=${limit}`
    const rows = await supabaseSelect<AnalyticsEvent>("analytics_events", query)
    
    // Map to frontend expected shape for backwards compatibility where necessary
    const events = (rows || []).map(row => ({
       id: row.id,
       event_type: row.event_type,
       payload: row.metrics,
       created_at: row.recorded_at
    }))
    
    return NextResponse.json({ events })
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
    const workspaceId = await resolveWorkspaceId(request)
    const rows = await supabaseInsert<AnalyticsEvent>("analytics_events", {
      workspace_id: workspaceId,
      event_type: body.type || "unknown",
      metrics: body.payload || {},
      recorded_at: body.createdAt || new Date().toISOString(),
    }, "return=representation")
    
    return NextResponse.json({ saved: true, event: rows?.[0] || null })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}
