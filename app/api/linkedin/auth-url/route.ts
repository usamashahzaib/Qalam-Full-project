import { NextRequest, NextResponse } from "next/server"
import { createLinkedInAuth } from "@/lib/server/linkedin"

export async function GET(request: NextRequest) {
  try {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") || undefined
    const auth = createLinkedInAuth(redirectTo)
    return NextResponse.json(auth)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "server_error" }, { status: 500 })
  }
}
