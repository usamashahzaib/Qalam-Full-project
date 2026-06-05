import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { getLinkedInPublishingAccount, getLinkedInToken } from "@/lib/server/linkedin-credentials"
import { ensureWorkspaceForUser, getClerkAuthContext, toPublicAuthUser } from "@/lib/server/workspace"

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ user: null })
  }

  try {
    const ctx = await getClerkAuthContext()
    const workspaceId = await ensureWorkspaceForUser({
      userId: ctx.supabaseUserId,
      firstName: ctx.firstName,
    })
    const account = await getLinkedInPublishingAccount(workspaceId)
    const legacy = account ? null : await getLinkedInToken(ctx.email)
    const linkedinMemberId = account?.provider_account_id || legacy?.member_id || null
    const linkedinTokenExpiresAt = account?.expires_at
      ? Date.parse(account.expires_at)
      : legacy?.token_expires_at || null

    return NextResponse.json({
      user: {
        ...toPublicAuthUser(ctx),
        linkedinMemberId,
        linkedinTokenExpiresAt,
      },
    })
  } catch {
    const user = await currentUser()
    if (!user) return NextResponse.json({ user: null })
    const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || ""
    return NextResponse.json({
      user: {
        email,
        fullName: user.fullName || email.split("@")[0] || "User",
        firstName: user.firstName || "User",
        role: "user" as const,
        imageUrl: user.imageUrl,
        linkedinMemberId: null,
        linkedinTokenExpiresAt: null,
      },
    })
  }
}
