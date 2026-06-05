import { NextRequest, NextResponse } from "next/server"
import { getAppSession } from "@/lib/server/app-session"

export async function GET(request: NextRequest) {
  try {
    const session = getAppSession(request)
    if (!session) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    if (!session.linkedinMemberId) {
      return NextResponse.json({ connected: false })
    }

    // Default mock company context or derived from profile industry
    return NextResponse.json({
      connected: true,
      memberId: session.linkedinMemberId,
      name: session.fullName,
      avatar: session.imageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(session.email)}`,
      company: "Qalam Creator",
      expiresAt: session.linkedinTokenExpiresAt,
    })
  } catch (error) {
    console.error("LinkedIn profile error:", error)
    return NextResponse.json({ error: (error as Error).message || "profile_failed" }, { status: 500 })
  }
}
