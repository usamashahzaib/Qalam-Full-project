import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { fetchJson } from "@/lib/server/supabase-rest"
import { storeLinkedInPublishingAccount, storeLinkedInToken } from "@/lib/server/linkedin-credentials"
import { ensureWorkspaceForUser, getClerkAuthContext } from "@/lib/server/workspace"

const getRedirectUri = (request: NextRequest) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return `${appUrl.replace(/\/$/, "")}/api/linkedin/callback`
}

async function fetchLinkedInMemberId(accessToken: string): Promise<string | null> {
  try {
    const userinfo = await fetchJson<Record<string, unknown>>("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    const sub = String(userinfo.data?.sub || "").trim()
    if (sub) return sub
  } catch {
    // fall through to legacy profile endpoint
  }

  try {
    const profile = await fetchJson<{ id?: string }>("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    return profile.data?.id ? String(profile.data.id) : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const cookieStore = await cookies()
  const storedState = cookieStore.get("linkedin_oauth_state")?.value

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/settings?linkedin=failed", request.url))
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL("/auth?linkedin=failed", request.url))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?linkedin=failed", request.url))
  }

  try {
    const redirectUri = getRedirectUri(request)
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    })

    const token = await fetchJson<{ access_token: string; expires_in: number }>(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        cache: "no-store",
      }
    )

    const accessToken = token.data.access_token
    const expiresAt = Date.now() + Number(token.data.expires_in || 0) * 1000
    const memberId = await fetchLinkedInMemberId(accessToken)

    const ctx = await getClerkAuthContext()
    const workspaceId = await ensureWorkspaceForUser({
      userId: ctx.supabaseUserId,
      firstName: ctx.firstName,
    })

    await storeLinkedInToken({
      ownerEmail: ctx.email,
      accessToken,
      memberId,
      tokenExpiresAt: expiresAt,
    })

    await storeLinkedInPublishingAccount({
      workspaceId,
      accessToken,
      memberId,
      tokenExpiresAt: expiresAt,
    })

    const response = NextResponse.redirect(new URL("/settings?linkedin=success", request.url))
    response.cookies.set("linkedin_oauth_state", "", {
      httpOnly: true,
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return response
  } catch (error) {
    console.error("linkedin_callback_failed", error)
    return NextResponse.redirect(new URL("/settings?linkedin=failed", request.url))
  }
}
