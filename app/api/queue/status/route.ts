import { NextRequest, NextResponse } from "next/server"
import { getQueuePosition, getSystemDemand } from "@/lib/server/queue"

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId")

  // No requestId - return current system demand for pre-generation status checks
  if (!requestId) {
    const demand = await getSystemDemand()
    return NextResponse.json({
      highDemand: demand.highDemand,
      activeCount: demand.activeCount,
      position: demand.position,
      estimatedWaitSeconds: demand.estimatedWaitSeconds,
    })
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
