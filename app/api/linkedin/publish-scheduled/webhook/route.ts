import { NextResponse } from "next/server"
import { qstashReceiver } from "@/lib/server/qstash"
import { publishScheduledPost } from "@/lib/server/linkedin-publish"
import { log } from "@/lib/server/logging"

export const maxDuration = 30
export const runtime = "nodejs"

/**
 * QStash delivers here at (or shortly after) each post's exact scheduled
 * time - this is the primary publish path. The daily cron at
 * /api/linkedin/publish-scheduled is a safety net for posts whose QStash
 * delivery never arrived (message lost, or QStash was unreachable when the
 * post was scheduled) and for reconciling anything stuck mid-publish.
 */
export async function POST(request: Request) {
  const receiver = qstashReceiver()
  if (!receiver) {
    log.error("linkedin.publish_webhook.receiver_not_configured", {})
    return NextResponse.json({ error: "qstash_not_configured" }, { status: 500 })
  }

  const signature = request.headers.get("upstash-signature")
  const body = await request.text()

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 })
  }

  let verified: boolean
  try {
    verified = await receiver.verify({ signature, body })
  } catch {
    verified = false
  }
  if (!verified) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 })
  }

  let postId: string
  try {
    const parsed = JSON.parse(body) as { postId?: string }
    postId = String(parsed.postId || "").trim()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }
  if (!postId) return NextResponse.json({ error: "postId_required" }, { status: 400 })

  const result = await publishScheduledPost(postId)
  return NextResponse.json(result)
}
