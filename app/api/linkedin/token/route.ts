import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { deleteLinkedInPublishingAccount, deleteLinkedInToken } from "@/lib/server/linkedin-credentials"

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth()

    const ctx = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request)
    await Promise.all([
      deleteLinkedInPublishingAccount(workspaceId).catch(() => undefined),
      deleteLinkedInToken(ctx.email).catch(() => undefined),
    ])
    return NextResponse.json({ disconnected: true })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}
