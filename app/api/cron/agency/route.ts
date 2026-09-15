// Vercel Cron: daily at 09:00 UTC - see vercel.json
// Silence-as-consent sweep, LinkedIn Token Guardian, Monday Voice Drops,
// and the Friday Wrap. Every job is idempotent, so a retry never double-sends.
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { verifyCronAuth } from "@/lib/server/verify-cron"
import { runTrackedCron } from "@/lib/server/cron-health"
import { log } from "@/lib/server/logging"
import { runAutoApproveSweep, runFridayWrap, runTokenGuardian, runWeeklyVoiceDrops } from "@/lib/server/agency/jobs"

const settle = async <T>(name: string, job: () => Promise<T>) => {
  try {
    return { ok: true as const, result: await job() }
  } catch (error) {
    log.error("agency.cron_job_failed", { job: name, error: (error as Error).message })
    return { ok: false as const, error: (error as Error).message }
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return runTrackedCron("agency", async () => {
    const now = new Date()
    const autoApprove = await settle("auto_approve", () => runAutoApproveSweep(now))
    const guardian = await settle("token_guardian", () => runTokenGuardian(now))
    const voiceDrops = await settle("voice_drops", () => runWeeklyVoiceDrops(now))
    const fridayWrap = await settle("friday_wrap", () => runFridayWrap(now))
    const failed = [autoApprove, guardian, voiceDrops, fridayWrap].some((job) => !job.ok)
    return NextResponse.json({ autoApprove, guardian, voiceDrops, fridayWrap }, { status: failed ? 500 : 200 })
  })
}
