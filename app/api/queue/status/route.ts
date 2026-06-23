import { NextRequest, NextResponse } from "next/server"
import { getQueuePosition } from "@/lib/server/queue"

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId")
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
  }

  const status = await getQueuePosition(requestId)

  if (!status) {
    return NextResponse.json({ status: "completed" })
  }

  const minutes = Math.ceil(status.estimatedWait / 60)
  const message =
    status.position === 1
      ? "You're first in line! Starting soon..."
      : `You're ${status.position} in line. Estimated wait: ${minutes} min.`

  return NextResponse.json({
    status: "queued",
    position: status.position,
    estimatedWaitSeconds: status.estimatedWait,
    message,
  })
}
