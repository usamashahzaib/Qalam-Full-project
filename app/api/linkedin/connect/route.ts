import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const origin = process.env.FRONTEND_ORIGIN || request.nextUrl.origin
    if (!clientId || !clientSecret) return NextResponse.json({ error: "LinkedIn OAuth not configured" }, { status: 500, headers: corsHeaders })

    const state = crypto.randomUUID()
    const cookieStore = await cookies()
    cookieStore.set("linkedin_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    })

    const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
    url.searchParams.set("response_type", "code")
    url.searchParams.set("client_id", clientId)
    url.searchParams.set("redirect_uri", `${origin}/api/linkedin/callback`)
    url.searchParams.set("scope", "openid profile email w_member_social")
    url.searchParams.set("state", state)

    return NextResponse.redirect(url, { headers: corsHeaders })
  } catch {
    return NextResponse.json({ error: "LinkedIn connect failed" }, { status: 500, headers: corsHeaders })
  }
}
