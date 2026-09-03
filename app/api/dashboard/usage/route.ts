import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { fetchDashboardUsage } from "@/lib/server/dashboard"

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    return NextResponse.json(await fetchDashboardUsage(workspaceId))
  } catch (error) {
    const message = (error as Error).message
    const status = message === "auth_required" ? 401 : message === "unauthorized_workspace" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
