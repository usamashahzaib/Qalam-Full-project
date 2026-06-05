import { NextRequest, NextResponse } from "next/server"
import { getAppSession, toPublicAuthUser } from "@/lib/server/app-session"

export async function GET(request: NextRequest) {
  const session = getAppSession(request)
  return NextResponse.json({ user: session ? toPublicAuthUser(session) : null })
}
