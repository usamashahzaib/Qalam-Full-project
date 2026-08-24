import { NextResponse } from "next/server"
import { submitIndexNow } from "@/lib/server/indexnow"
import { verifyCronAuth } from "@/lib/server/verify-cron"
import { runTrackedCron } from "@/lib/server/cron-health"

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return runTrackedCron("indexnow", async () => {
    const result = await submitIndexNow()
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  })
}
