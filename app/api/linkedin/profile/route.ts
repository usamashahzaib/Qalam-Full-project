import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getClerkAuthContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { getLinkedInPublishingAccount, getLinkedInToken } from "@/lib/server/linkedin-credentials"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    const ctx = await getClerkAuthContext()
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
      avatar: ctx.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(ctx.email)}`,
      company: "Qalam Creator",
      expiresAt,
    })
  } catch (error) {
    console.error("LinkedIn profile error:", error)
    return NextResponse.json({ error: (error as Error).message || "profile_failed" }, { status: 500 })
  }
}
