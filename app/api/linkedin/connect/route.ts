import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"

const isMissing = (value?: string) => !value || /placeholder|your_|changeme|dummy|mock|fake/i.test(value)

export async function GET() {
  const userId = await requireAuth()

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (isMissing(clientId) || isMissing(clientSecret)) {
    return NextResponse.json(
      { error: "LinkedIn integration is not configured. Contact support." },
      { status: 503 }
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`
  const state = Buffer.from(userId).toString("base64")
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=w_member_social`
  const response = NextResponse.redirect(authUrl)
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return response
}
