import { NextRequest, NextResponse } from "next/server"
import { getAppSession } from "@/lib/server/app-session"
import { shareToLinkedIn } from "@/lib/server/linkedin"
import { getLinkedInToken } from "@/lib/server/linkedin-credentials"

type ShareRequestBody = {
  content?: string
  media?: { id?: string; title?: string } | null
}

export async function POST(request: NextRequest) {
  try {
    const session = getAppSession(request)
    const body = (await request.json()) as ShareRequestBody

    if (!session?.email) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 })
    }

    const cred = await getLinkedInToken(session.email)
    if (!cred?.access_token || !cred?.member_id) {
      return NextResponse.json({ error: "linkedin_auth_required" }, { status: 401 })
    }
    if (cred.token_expires_at && cred.token_expires_at < Date.now()) {
      return NextResponse.json({ error: "linkedin_token_expired" }, { status: 401 })
    }

    const { access_token: accessToken, member_id: memberId } = cred
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "share_payload_invalid" }, { status: 400 })
    }

    const shared = await shareToLinkedIn({
      accessToken,
      authorId: memberId,
      content: body.content,
      media: body.media || undefined,
    })

    return NextResponse.json(shared)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "server_error" }, { status: 500 })
  }
}
