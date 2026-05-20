import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"

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

/**
 * GET /api/workspace - resolves and returns the active workspace ID.
 * The server validates membership. The client uses this to know which workspace to operate in.
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    return NextResponse.json({ workspaceId })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: toStatus(message) })
  }
}

/**
 * PUT /api/workspace - deprecated legacy endpoint.
 * New code must write through domain APIs such as /api/posts.
 */
export async function PUT(request: NextRequest) {
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