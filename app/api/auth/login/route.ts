import { NextRequest, NextResponse } from "next/server"
import { appSessionCookieName, createAppSession, toPublicAuthUser } from "@/lib/server/app-session"

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  try {
    const body = (await request.json()) as { email?: string; name?: string }
    const email = body.email?.trim().toLowerCase() || ""
    const name = body.name?.trim() || ""

    if (!email) {
      return NextResponse.json({ error: "auth_email_required" }, { status: 400 })
    }

    const session = await createAppSession({ email, name })
    const response = NextResponse.json({ user: toPublicAuthUser(session.payload) })
    response.cookies.set({
      name: appSessionCookieName,
      value: session.token,
      maxAge: session.maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: false, // dev-only endpoint — returns 404 in production
      path: "/",
    })
    return response
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "server_error" }, { status: 500 })
  }
}
