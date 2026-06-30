import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { getLinkedInPublishingAccount, getLinkedInToken } from "@/lib/server/linkedin-credentials"

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
}

type LinkedInMe = {
  id?: string
  localizedFirstName?: string
  localizedLastName?: string
  vanityName?: string
  profilePicture?: { displayImage?: string }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request)
    const account = await getLinkedInPublishingAccount(workspaceId)
    const legacy = account ? null : await getLinkedInToken(ctx.supabaseUserId)
    const accessToken = account?.access_token || legacy?.access_token || ""
    const expiresAt = account?.expires_at ? Date.parse(account.expires_at) : legacy?.token_expires_at || null

    if (!accessToken) return NextResponse.json({ connected: false, error: "LinkedIn token not found" }, { status: 404, headers: corsHeaders })
    if (expiresAt && expiresAt < Date.now()) return NextResponse.json({ error: "linkedin_token_expired", reconnectRequired: true }, { status: 401, headers: corsHeaders })

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const isNearExpiry = expiresAt != null && expiresAt - Date.now() < SEVEN_DAYS_MS

    const res = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": process.env.LINKEDIN_VERSION || "202602",
      },
      cache: "no-store",
    })

    if (res.status === 401) return NextResponse.json({ error: "LinkedIn token expired" }, { status: 401, headers: corsHeaders })
    if (!res.ok) return NextResponse.json({ error: "LinkedIn profile fetch failed" }, { status: 502, headers: corsHeaders })

    const profile = (await res.json()) as LinkedInMe
    const firstName = profile.localizedFirstName || ""
    const lastName = profile.localizedLastName || ""
    return NextResponse.json(
      {
        connected: true,
        id: profile.id || account?.provider_account_id || legacy?.member_id || null,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim() || "LinkedIn Account",
        headline: "",
        avatar: profile.profilePicture?.displayImage || null,
        profilePicture: profile.profilePicture?.displayImage || null,
        vanityName: profile.vanityName || null,
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
