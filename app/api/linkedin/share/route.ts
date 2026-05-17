import { NextRequest, NextResponse } from "next/server"
import { getAppSession } from "@/lib/server/app-session"
import { shareToLinkedIn } from "@/lib/server/linkedin"

type ShareRequestBody = {
  content?: string
  media?: { id?: string; title?: string } | null
}

export async function POST(request: NextRequest) {
  try {
    const session = getAppSession(request)
    const body = (await request.json()) as ShareRequestBody

    if (!session?.linkedinAccessToken || !session.linkedinMemberId) {
      return NextResponse.json({ error: "linkedin_auth_required" }, { status: 401 })
    }
    if (session.linkedinTokenExpiresAt && session.linkedinTokenExpiresAt < Date.now()) {
      return NextResponse.json({ error: "linkedin_token_expired" }, { status: 401 })
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "share_payload_invalid" }, { status: 400 })
    }

    const shared = await shareToLinkedIn({
      accessToken: session.linkedinAccessToken,
      authorId: session.linkedinMemberId,
      content: body.content,
      media: body.media || undefined,
    })

    return NextResponse.json(shared)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "server_error" }, { status: 500 })
  }
}
