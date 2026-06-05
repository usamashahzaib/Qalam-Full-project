import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getClerkAuthContext, resolveWorkspaceId, fetchWorkspacePlan } from "@/lib/server/workspace"

const toStatus = (message: string) => {
  switch (message) {
    case "auth_required":
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
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 })
  }

  try {
    const ctx = await getClerkAuthContext()
    const workspaceId = await resolveWorkspaceId(request)
    const planInfo = await fetchWorkspacePlan(workspaceId, ctx.email)
    return NextResponse.json({ workspaceId, ...planInfo })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: toStatus(message) })
  }
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 })
  }

  try {
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
