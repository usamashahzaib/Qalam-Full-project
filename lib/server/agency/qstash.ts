import "server-only"

import { Client } from "@upstash/qstash"
import { env } from "@/lib/server/env"
import { log } from "@/lib/server/logging"

export type AgencyCallbackJob = "auto-approve"

let client: Client | null = null

/**
 * Exact-time delivery for agency jobs. Returns false when QStash is not
 * configured; the daily agency cron sweep still advances every job, just
 * without minute-level precision.
 */
export async function scheduleAgencyCallback(job: AgencyCallbackJob, payload: Record<string, string>, at: Date): Promise<boolean> {
  if (!env.qstashToken) return false
  client ??= new Client({ token: env.qstashToken })
  try {
    await client.publishJSON({
      url: `${env.frontendOrigin}/api/cron/agency-callback`,
      body: { job, ...payload },
      notBefore: Math.max(Math.floor(Date.now() / 1000), Math.floor(at.getTime() / 1000)),
      retries: 3,
    })
    return true
  } catch (error) {
    log.error("agency.qstash_schedule_failed", { job, error: (error as Error).message })
    return false
  }
}
