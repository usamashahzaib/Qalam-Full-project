import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { storeLinkedInPublishingAccount, storeLinkedInToken } from "@/lib/server/linkedin-credentials"

const redirectToSettings = (request: NextRequest, status: "success" | "error") =>
  NextResponse.redirect(new URL(`/settings?linkedin=${status}`, request.nextUrl.origin))

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
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/api/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID || "",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!tokenRes.ok) throw new Error("linkedin_token_exchange_failed")
    const tokenData = await tokenRes.json() as { access_token?: string; expires_in?: number }
    const accessToken = tokenData.access_token
    if (!accessToken) throw new Error("linkedin_token_missing")

    const profileRes = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": process.env.LINKEDIN_VERSION || "202602",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!profileRes.ok) throw new Error("linkedin_profile_failed")
    const profile = await profileRes.json() as { id?: string }
    const memberId = profile.id || null
    const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null

    await storeLinkedInToken({ userId: ctx.supabaseUserId, accessToken, memberId, tokenExpiresAt: expiresAt })
    await storeLinkedInPublishingAccount({ workspaceId, accessToken, memberId, tokenExpiresAt: expiresAt })

    const response = redirectToSettings(request, "success")
    response.cookies.delete("linkedin_oauth_state")
    return response
  } catch {
    const response = redirectToSettings(request, "error")
    response.cookies.delete("linkedin_oauth_state")
    return response
  }
}
