import { NextRequest, NextResponse } from "next/server"
import { createLinkedInAuth } from "@/lib/server/linkedin"

export async function GET(request: NextRequest) {
  try {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") || undefined
    const auth = createLinkedInAuth(redirectTo)
    return NextResponse.json(auth)
  } catch (error) {
    const message = (error as Error).message || "server_error"
    const status = message === "Unauthorized" ? 401 : message === "linkedin_env_missing" ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
