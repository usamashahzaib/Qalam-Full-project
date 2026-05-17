import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceKey } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

type WorkspaceJob = {
  id: string
  workspace_key: string
  job_type: string
  status: string
  title: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  try {
    const workspaceKey = resolveWorkspaceKey(request)
    const type = request.nextUrl.searchParams.get("type")
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 500)
    const filters = [
      `workspace_key=eq.${encodeURIComponent(workspaceKey)}`,
      type ? `job_type=eq.${encodeURIComponent(type)}` : "",
      "select=*",
      "order=created_at.desc",
      `limit=${limit}`,
    ]
      .filter(Boolean)
      .join("&")

    const rows = await supabaseSelect<WorkspaceJob>("workspace_jobs", filters)
    return NextResponse.json({ jobs: rows || [] })
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
      status?: string
      title?: string
      payload?: Record<string, unknown>
      createdAt?: string
    }
    const workspaceKey = resolveWorkspaceKey(request)
    const rows = await supabaseInsert<WorkspaceJob>("workspace_jobs", {
      id: body.id || randomUUID(),
      workspace_key: workspaceKey,
      job_type: body.type || "unknown",
      status: body.status || "completed",
      title: body.title || "Untitled job",
      payload: body.payload || {},
      created_at: body.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return NextResponse.json({ saved: true, job: rows?.[0] || null })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}
