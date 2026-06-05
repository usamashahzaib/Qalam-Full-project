import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 })

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: "linkedin_not_configured",
        message: "LinkedIn integration is not configured. Contact support.",
      },
      { status: 503 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/linkedin/callback`
  const state = crypto.randomUUID()

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  url.searchParams.set("scope", "r_liteprofile r_basicprofile w_member_social")

  const response = NextResponse.redirect(url.toString())
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return response
}
