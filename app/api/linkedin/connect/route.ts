import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole } from "@/lib/server/roles"
import { signOAuthState } from "@/lib/server/oauth-state"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const origin = process.env.FRONTEND_ORIGIN || request.nextUrl.origin
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/linkedin/callback`
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET." }, { status: 500 })
  }

  // Resolve which workspace this connect is for (?client=<id> from the
  // caller's current URL, or the personal workspace by default) up front
  // and pack it into the signed state - LinkedIn's redirect back drops any
  // query params we don't control, so the callback can't re-derive this
  // from the URL the way other routes do via resolveWorkspaceId(request).
  let workspaceId: string
  try {
    workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const state = signOAuthState({ workspaceId })

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", "openid profile email w_member_social")
  url.searchParams.set("state", state)

  const response = NextResponse.redirect(url)
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })
  return response
}
