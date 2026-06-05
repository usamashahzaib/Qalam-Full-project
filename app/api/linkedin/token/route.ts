import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getClerkAuthContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { deleteLinkedInPublishingAccount, deleteLinkedInToken } from "@/lib/server/linkedin-credentials"

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    const ctx = await getClerkAuthContext()
    const workspaceId = await resolveWorkspaceId(request)
    await Promise.all([
      deleteLinkedInPublishingAccount(workspaceId).catch(() => undefined),
      deleteLinkedInToken(ctx.email).catch(() => undefined),
    ])
    return NextResponse.json({ disconnected: true })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: msg === "auth_required" ? 401 : 500 })
  }
}
