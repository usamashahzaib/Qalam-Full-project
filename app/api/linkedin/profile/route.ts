import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/auth-helpers"
import { getAuthContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { getLinkedInPublishingAccount, getLinkedInToken } from "@/lib/server/linkedin-credentials"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const ctx = await getAuthContext()
    const workspaceId = await resolveWorkspaceId(request)
    const account = await getLinkedInPublishingAccount(workspaceId)
    const legacy = account ? null : await getLinkedInToken(ctx.email)
    const memberId = account?.provider_account_id || legacy?.member_id || null
    const expiresAt = account?.expires_at
      ? Date.parse(account.expires_at)
      : legacy?.token_expires_at || null

    if (!memberId) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      memberId,
      name: ctx.fullName,
      avatar: ctx.imageUrl,
      expiresAt,
    })
  } catch (error) {
    console.error("LinkedIn profile error:", error)
    const message = (error as Error).message || "profile_failed"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
