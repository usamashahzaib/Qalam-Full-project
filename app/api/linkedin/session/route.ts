import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"
import { getClerkAuthContext, resolveWorkspaceId, ensureWorkspaceForUser } from "@/lib/server/workspace"
import { consumeLinkedInSession, linkedInSessionCookieName } from "@/lib/server/linkedin"
import { storeLinkedInPublishingAccount, storeLinkedInToken } from "@/lib/server/linkedin-credentials"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(linkedInSessionCookieName)?.value
  if (!token) {
    return NextResponse.json({ error: "linkedin_session_missing" }, { status: 404 })
  }
    const userId = await requireAuth()

  try {
    const session = consumeLinkedInSession(token)
    const profile = session.profile || {}
    const ctx = await getClerkAuthContext()
    const ownerEmail = ctx.email
    const memberId = String(profile.sub || "") || null
    const fullName =
      String(profile.name || "").trim() ||
      `${String(profile.given_name || "")} ${String(profile.family_name || "")}`.trim() ||
      ctx.fullName

    try {
      await storeLinkedInToken({
        ownerEmail,
        accessToken: session.accessToken,
        memberId,
        tokenExpiresAt: session.expiresAt,
      })
    } catch (error) {
      console.error("linkedin_token_store_failed", error)
    }

    try {
      const workspaceId = await ensureWorkspaceForUser({
        userId: ctx.supabaseUserId,
        firstName: ctx.firstName,
      })
      await storeLinkedInPublishingAccount({
        workspaceId,
        accessToken: session.accessToken,
        memberId,
        tokenExpiresAt: session.expiresAt,
      })
    } catch (error) {
      console.error("publishing_account_store_failed", error)
    }

    const success = NextResponse.json({
      user: {
        email: ownerEmail,
        fullName,
        firstName: ctx.firstName,
        role: ctx.role,
        imageUrl: String(profile.picture || "") || ctx.imageUrl,
        linkedinMemberId: memberId,
        linkedinTokenExpiresAt: session.expiresAt,
      },
    })
    success.cookies.set({
      name: linkedInSessionCookieName,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return success
  } catch (error) {
    console.error("linkedin_session_exchange_failed", error)
    return NextResponse.json({ error: (error as Error).message || "linkedin_session_missing" }, { status: 404 })
  }
}
