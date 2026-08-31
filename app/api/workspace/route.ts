import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, requireAuth, resolveWorkspaceId, resolveEffectivePlan } from "@/lib/server/workspace"

const toStatus = (message: string) => {
  switch (message) {
    case "auth_required":
    case "Unauthorized":
      return 401
    case "unauthorized_workspace":
      return 403
    case "schema_not_applied":
      return 503
    default:
      return 500
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request, undefined, ctx)
    const planInfo = await resolveEffectivePlan(workspaceId, ctx.email, ctx.supabaseUserId)
    return NextResponse.json({ workspaceId, ...planInfo })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: toStatus(message) })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth()
    await resolveWorkspaceId(request)
    return NextResponse.json(
      { error: "workspace_snapshot_deprecated", message: "Use /api/posts and domain APIs instead." },
      { status: 410 }
    )
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: toStatus(message) })
  }
}
