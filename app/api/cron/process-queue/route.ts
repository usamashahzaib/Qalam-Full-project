// Triggered hourly by a QStash Schedule (not vercel.json - Vercel Hobby crons are
// daily-only and both slots are taken). Register with: node scripts/setup-qstash-schedules.mjs
// AI generation runs synchronously in route handlers - there is no background job queue,
// so posts.status never actually reaches "queued" (that value isn't even in the
// posts_status_check constraint). This cron instead recovers the one state that *can*
// get stuck mid-request: "publishing", when the process dies between claiming a
// scheduled post and finishing the LinkedIn call. Delegates to the same reconciliation
// used by the daily safety-net sweep so the two never diverge.
export const maxDuration = 30

import { NextRequest, NextResponse } from "next/server"
import { verifyCronAuth } from "@/lib/server/verify-cron"
import { reconcileStuckPublishing } from "@/lib/server/linkedin-publish"
import { runTrackedCron } from "@/lib/server/cron-health"

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return runTrackedCron("process-queue", async () => {
    try {
      const { finalized, reverted } = await reconcileStuckPublishing()
      return NextResponse.json({ recovered: finalized + reverted, finalized, reverted })
    } catch (error) {
      console.error("[cron/process-queue] reconciliation error:", (error as Error).message)
      return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
  })
}
