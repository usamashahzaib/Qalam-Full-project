import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { createScopedClient, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { errorToStatus, requireRole } from "@/lib/server/roles"

type Job = {
  id: string
  workspace_id: string
  type: string
  status: string
  payload: Record<string, unknown>
  result: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response

    const workspaceId = await resolveWorkspaceId(request)
    const type = request.nextUrl.searchParams.get("type")
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 500)
    const filters = [
      `workspace_id=eq.${workspaceId}`,
      type ? `type=eq.${encodeURIComponent(type)}` : "",
      "select=*",
      "order=created_at.desc",
      `limit=${limit}`,
    ]
      .filter(Boolean)
      .join("&")

    const rows = await supabaseSelect<Job>("jobs", filters)
    
    // Maintain backwards compatibility with frontend expected format
    const jobs = (rows || []).map((row) => ({
      id: row.id,
      job_type: row.type,
      status: row.status,
      payload: row.payload,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))

    return NextResponse.json({ jobs })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: (message === "auth_required" || message === "Unauthorized") ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response

    const body = (await request.json()) as {
      id?: string
      workspaceKey?: string
      type?: string
      status?: string
      title?: string
      payload?: Record<string, unknown>
      createdAt?: string
    }
    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const rows = await supabaseInsert<Job>("jobs", {
      workspace_id: workspaceId,
      type: body.type || "unknown",
      status: body.status || "completed",
      payload: body.payload || {},
      created_at: body.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, "return=representation")
    
    return NextResponse.json({ saved: true, job: rows?.[0] || null })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response

    const workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
    const url = new URL(request.url)
    const parsedId = jobIdSchema.safeParse(url.searchParams.get("id"))
    if (!parsedId.success) return NextResponse.json({ error: "invalid_id" }, { status: 400 })

    await createScopedClient(workspaceId).from("jobs").delete().eq("id", parsedId.data)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }
}

const jobIdSchema = z.string().uuid("id must be a valid UUID")
