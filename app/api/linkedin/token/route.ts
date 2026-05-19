import { NextRequest, NextResponse } from "next/server"
import { requireAppSession, resolveWorkspaceId } from "@/lib/server/app-session"
import { deleteLinkedInPublishingAccount, deleteLinkedInToken } from "@/lib/server/linkedin-credentials"

export async function DELETE(request: NextRequest) {
  try {
    const session = requireAppSession(request)
    const workspaceId = await resolveWorkspaceId(request)
    await Promise.all([
      deleteLinkedInPublishingAccount(workspaceId).catch(() => undefined),
      deleteLinkedInToken(session.email).catch(() => undefined),
    ])
    return NextResponse.json({ disconnected: true })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: msg === "auth_required" ? 401 : 500 })
  }
}
