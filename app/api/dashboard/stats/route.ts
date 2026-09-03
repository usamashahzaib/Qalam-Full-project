import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { fetchDashboardStats } from "@/lib/server/dashboard"

export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request, undefined, context)
    const stats = await fetchDashboardStats(context.supabaseUserId, workspaceId, context.email)
    return NextResponse.json(stats)
  } catch (error) {
    const message = (error as Error).message
    const status = message === "auth_required" ? 401 : message === "unauthorized_workspace" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
