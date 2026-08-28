import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { ensureFreshLinkedInPublishingAccount, ensureFreshLinkedInToken } from "@/lib/server/linkedin-credentials"

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
}

type LinkedInUserInfo = {
  sub?: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request)
    const account = await ensureFreshLinkedInPublishingAccount(workspaceId)
    const legacy = account ? null : await ensureFreshLinkedInToken(ctx.supabaseUserId)
    const accessToken = account?.access_token || legacy?.access_token || ""
    const expiresAt = account?.expires_at ? Date.parse(account.expires_at) : legacy?.token_expires_at || null

    if (!accessToken) return NextResponse.json({ connected: false }, { headers: corsHeaders })
    if (expiresAt && expiresAt < Date.now()) return NextResponse.json({ error: "linkedin_token_expired", reconnectRequired: true }, { status: 401, headers: corsHeaders })

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const isNearExpiry = expiresAt != null && expiresAt - Date.now() < SEVEN_DAYS_MS

    // OIDC-scoped tokens (openid profile email w_member_social) must use /v2/userinfo.
    // The legacy /v2/me endpoint returns 403 for these tokens.
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    })

    if (res.status === 401) return NextResponse.json({ error: "LinkedIn token expired" }, { status: 401, headers: corsHeaders })
    if (!res.ok) return NextResponse.json({ error: "LinkedIn profile fetch failed" }, { status: 502, headers: corsHeaders })

    const profile = (await res.json()) as LinkedInUserInfo
    const firstName = profile.given_name || profile.name?.split(" ")[0] || ""
    const lastName = profile.family_name || profile.name?.split(" ").slice(1).join(" ") || ""
    return NextResponse.json(
      {
        connected: true,
        id: profile.sub || account?.provider_account_id || legacy?.member_id || null,
        firstName,
        lastName,
        name: profile.name || `${firstName} ${lastName}`.trim() || "LinkedIn Account",
        headline: "",
        avatar: profile.picture || null,
        profilePicture: profile.picture || null,
        vanityName: null,
        tokenExpiresAt: expiresAt,
        isNearExpiry,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "profile_failed"
    return NextResponse.json({ error: message }, { status: (message === "Unauthorized" || message === "auth_required") ? 401 : 500, headers: corsHeaders })
  }
}
