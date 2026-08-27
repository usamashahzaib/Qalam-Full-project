import { NextRequest, NextResponse } from "next/server"
import { cleanupOldPdfs } from "@/lib/use-cases/cleanup-old-pdfs"
import { verifyCronAuth } from "@/lib/server/verify-cron"
import { runTrackedCron } from "@/lib/server/cron-health"

// Triggered daily at 02:00 UTC by a QStash Schedule (not vercel.json - Vercel Hobby
// crons are daily-only and both slots are taken). Register with: node scripts/setup-qstash-schedules.mjs
export const maxDuration = 30

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  return runTrackedCron("cleanup-pdfs", async () => {
    const result = await cleanupOldPdfs()

    if (!result.ok) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ cleared: result.data.cleared, ok: true })
  })
}
