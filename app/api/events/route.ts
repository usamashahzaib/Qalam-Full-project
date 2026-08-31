import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { errorToStatus, requireRole } from "@/lib/server/roles"
import { z } from "zod"

const eventSchema = z.object({
  id: z.string().max(100).optional(),
  workspaceKey: z.string().uuid().optional(),
  type: z.string().trim().min(1).max(80).regex(/^[a-z0-9_.]+$/),
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().optional(),
})

type AnalyticsEvent = {
  id: string
  workspace_id: string
  event_type: string
  metrics: Record<string, unknown>
  recorded_at: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response

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
    return NextResponse.json({ error: message }, { status: (message === "auth_required" || message === "Unauthorized") ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response

    const parsed = eventSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 })
    const body = parsed.data
    if (JSON.stringify(body.payload).length > 8000) return NextResponse.json({ error: "event_payload_too_large" }, { status: 413 })
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const rows = await supabaseInsert<AnalyticsEvent>("analytics_events", {
      workspace_id: workspaceId,
      event_type: body.type,
      metrics: body.payload,
      recorded_at: body.createdAt || new Date().toISOString(),
    }, "return=representation")
    
    return NextResponse.json({ saved: true, event: rows?.[0] || null })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }
}
