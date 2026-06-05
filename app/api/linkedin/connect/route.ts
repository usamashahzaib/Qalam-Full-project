import { NextRequest, NextResponse } from "next/server"
import { getAppSession, createAppSession, appSessionCookieName, resolveWorkspaceId } from "@/lib/server/app-session"
import { createLinkedInAuth } from "@/lib/server/linkedin"
import { storeLinkedInToken, storeLinkedInPublishingAccount } from "@/lib/server/linkedin-credentials"
import { env } from "@/lib/server/env"

export async function GET(request: NextRequest) {
  try {
    const session = getAppSession(request)
    if (!session) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const isMock = searchParams.get("mock") === "true" || !env.linkedInClientId || !env.linkedInClientSecret
    const redirectTo = searchParams.get("redirectTo") || "/settings"

    if (isMock) {
      // Mock Connection Flow
      const mockMemberId = `mock_member_id_${session.email.split("@")[0]}`
      const mockExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 60 // 60 days
      const mockAccessToken = `mock_access_token_${Math.random().toString(36).substring(2)}`
      const mockAvatar = session.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(session.email)}`

      // 1. Store credentials in database
      await storeLinkedInToken({
        ownerEmail: session.email,
        accessToken: mockAccessToken,
        memberId: mockMemberId,
        tokenExpiresAt: mockExpiresAt,
      })

      // 2. Store publishing account in database
      const workspaceId = await resolveWorkspaceId(request)
      await storeLinkedInPublishingAccount({
        workspaceId,
        accessToken: mockAccessToken,
        memberId: mockMemberId,
        tokenExpiresAt: mockExpiresAt,
      })

      // 3. Create a new session payload with connected LinkedIn info
      const appSession = await createAppSession({
        email: session.email,
        name: session.fullName,
        imageUrl: mockAvatar,
        linkedinMemberId: mockMemberId,
        linkedinTokenExpiresAt: mockExpiresAt,
      })

      // 4. Redirect user and set updated session cookie
      const redirectUrl = new URL(redirectTo, request.url)
      redirectUrl.searchParams.set("linkedin", "success")
      
      const response = NextResponse.redirect(redirectUrl)
      response.cookies.set({
        name: appSessionCookieName,
        value: appSession.token,
        maxAge: appSession.maxAge,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      })

      return response
    } else {
      // Real OAuth Flow
      const auth = createLinkedInAuth(redirectTo)
      return NextResponse.redirect(auth.url)
    }
  } catch (error) {
    console.error("LinkedIn connect error:", error)
    return NextResponse.json({ error: (error as Error).message || "connect_failed" }, { status: 500 })
  }
}
