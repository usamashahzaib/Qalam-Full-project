import { NextRequest, NextResponse } from "next/server"
import { appSessionCookieName, createAppSession, toPublicAuthUser } from "@/lib/server/app-session"
import { consumeLinkedInSession, linkedInSessionCookieName } from "@/lib/server/linkedin"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(linkedInSessionCookieName)?.value
  if (!token) {
    return NextResponse.json({ error: "linkedin_session_missing" }, { status: 404 })
  }

  try {
    const session = consumeLinkedInSession(token)
    const profile = session.profile || {}
    const appSession = await createAppSession({
      email: String(profile.email || "").trim().toLowerCase() || `linkedin-${profile.sub || Date.now()}@local.qalam`,
      name:
        String(profile.name || "").trim() ||
        `${String(profile.given_name || "")} ${String(profile.family_name || "")}`.trim() ||
        "LinkedIn User",
      imageUrl: String(profile.picture || "") || null,
      linkedinMemberId: String(profile.sub || "") || null,
      linkedinAccessToken: session.accessToken,
      linkedinTokenExpiresAt: session.expiresAt,
    })
    const success = NextResponse.json({ user: toPublicAuthUser(appSession.payload) })
    success.cookies.set({
      name: linkedInSessionCookieName,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    success.cookies.set({
      name: appSessionCookieName,
      value: appSession.token,
      maxAge: appSession.maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return success
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "linkedin_session_missing" }, { status: 404 })
  }
}
