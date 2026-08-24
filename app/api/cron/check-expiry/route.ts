import { NextResponse } from "next/server"
import { sendExpiryReminders } from "@/lib/server/plan-expiry"
import { verifyCronAuth } from "@/lib/server/verify-cron"
import { runTrackedCron } from "@/lib/server/cron-health"

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return runTrackedCron("check-expiry", async () => {
    const result = await sendExpiryReminders()
    return NextResponse.json(result)
  })
}
