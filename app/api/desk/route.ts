import { NextResponse } from "next/server"
import { getWorkspaceSessionContext } from "@/lib/server/workspace"
import { agencyErrorResponse, listMemberWorkspaces } from "@/lib/server/agency/access"
import { buildDesk } from "@/lib/server/agency/desk"
import { buildClientHealth } from "@/lib/server/agency/portfolio"
import { hasPermission } from "@/lib/server/roles"

export async function GET() {
  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaces = await listMemberWorkspaces(ctx.supabaseUserId)
    const workable = workspaces.filter((workspace) => hasPermission(workspace.role, "editor"))
    const [desk, clients] = await Promise.all([buildDesk(workable), buildClientHealth(workable)])
    const actionable = desk.counts.failed + desk.counts.needs_revision + desk.counts.approved_ready + desk.counts.fresh_material
    return NextResponse.json({
      firstName: ctx.firstName,
      items: desk.items,
      counts: desk.counts,
      actionable,
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        brandingColor: client.brandingColor,
        cadence: client.cadence,
        linkedIn: client.linkedIn,
        nextScheduledAt: client.nextScheduledAt,
      })),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return agencyErrorResponse(error, "agency.desk")
  }
}
