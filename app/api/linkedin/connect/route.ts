import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole } from "@/lib/server/roles"
import { signOAuthState } from "@/lib/server/oauth-state"
import { linkedInAuthorizationUrl, linkedInStateCookie } from "@/lib/server/linkedin-oauth"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin))
  }

  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
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

  const state = signOAuthState({ kind: "member", workspaceId })
  const url = linkedInAuthorizationUrl(state, request.nextUrl.origin)
  if (!url) return NextResponse.json({ error: "linkedin_not_configured" }, { status: 500 })

  const response = NextResponse.redirect(url)
  const cookie = linkedInStateCookie(state)
  response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}
