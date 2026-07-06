import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { storeLinkedInPublishingAccount, storeLinkedInToken } from "@/lib/server/linkedin-credentials"

const redirectToSettings = (request: NextRequest, status: "success" | "error", message?: string) => {
  const url = new URL(`/settings?linkedin=${status}`, request.nextUrl.origin)
  if (message) url.searchParams.set("message", message)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const expectedState = cookieStore.get("linkedin_oauth_state")?.value || ""
  const state = request.nextUrl.searchParams.get("state") || ""
  const code = request.nextUrl.searchParams.get("code") || ""

  if (!code || !state || state !== expectedState) {
    const response = redirectToSettings(request, "error")
    response.cookies.delete("linkedin_oauth_state")
    return response
  }

  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request)
    const origin = process.env.FRONTEND_ORIGIN || request.nextUrl.origin
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/linkedin/callback`
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID || "",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!tokenRes.ok) throw new Error("linkedin_token_exchange_failed")
    const tokenData = await tokenRes.json() as { access_token?: string; expires_in?: number }
    const accessToken = tokenData.access_token
    if (!accessToken) throw new Error("linkedin_token_missing")

    // OIDC userinfo: the connect route requests OIDC scopes (openid profile email),
    // under which the legacy /v2/me endpoint returns 403. The OIDC `sub` claim is the
    // member id; the author URN is built elsewhere as `urn:li:person:{sub}`.
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!profileRes.ok) throw new Error("linkedin_profile_failed")
    const profile = await profileRes.json() as { sub?: string }
    const memberId = profile.sub || null
    if (!memberId) throw new Error("linkedin_member_id_missing")
    const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null

    await storeLinkedInToken({ userId: ctx.supabaseUserId, accessToken, memberId, tokenExpiresAt: expiresAt })
    await storeLinkedInPublishingAccount({ workspaceId, accessToken, memberId, tokenExpiresAt: expiresAt })

    const response = redirectToSettings(request, "success")
    response.cookies.delete("linkedin_oauth_state")
    return response
  } catch (error) {
    const message = (error as Error).message || "linkedin_connect_failed"
    console.error("[linkedin/callback] failed:", message)
    const response = redirectToSettings(request, "error", message)
    response.cookies.delete("linkedin_oauth_state")
    return response
  }
}
