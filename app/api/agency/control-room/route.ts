import { NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { agencyErrorResponse, listMemberWorkspaces } from "@/lib/server/agency/access"
import { buildClientHealth } from "@/lib/server/agency/portfolio"
import { sortExceptions } from "@/lib/agency/health"

export async function GET() {
  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaces = await listMemberWorkspaces(ctx.supabaseUserId)
    const managed = workspaces.filter((workspace) => workspace.role === "owner" || workspace.role === "admin")
    const clients = await buildClientHealth(managed)
    const exceptions = sortExceptions(clients.flatMap((client) => client.exceptions))
    return NextResponse.json({
      clients,
      exceptions,
      totals: {
        clients: clients.length,
        healthy: clients.filter((client) => client.health === "healthy").length,
        shippedThisWeek: clients.reduce((sum, client) => sum + client.cadence.publishedThisWeek, 0),
        pendingApprovals: clients.reduce((sum, client) => sum + client.pendingApprovals, 0),
        longestStreak: clients.reduce((max, client) => Math.max(max, client.cadence.streakWeeks), 0),
      },
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return agencyErrorResponse(error, "agency.control_room")
  }
}
