import "server-only"

import { sendTransactionalEmail } from "@/lib/server/email"
import { env, supportEnv } from "@/lib/server/env"
import { createServiceClient } from "@/lib/server/supabase-rest"

const EXPIRY_STALE_AFTER_MS = 48 * 60 * 60 * 1000
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000

type CronRun = {
  job_name: string
  last_success_at: string | null
  last_alerted_at: string | null
}

const errorMessage = (value: unknown) => value instanceof Error ? value.message : String(value)

async function upsertCronRun(jobName: string, values: Record<string, unknown>) {
  const supabase = createServiceClient()
  const { error } = await supabase.from("cron_runs").upsert({
    job_name: jobName,
    ...values,
    updated_at: new Date().toISOString(),
  }, { onConflict: "job_name" })
  if (error) throw error
}

export async function runTrackedCron(jobName: string, handler: () => Promise<Response>): Promise<Response> {
  const startedAt = new Date()
  await upsertCronRun(jobName, { last_started_at: startedAt.toISOString() }).catch((error) => {
    console.error("cron_health_start_failed", { jobName, error: errorMessage(error) })
  })

  try {
    const response = await handler()
    const durationMs = Date.now() - startedAt.getTime()
    const values = response.ok
      ? { last_success_at: new Date().toISOString(), last_error: null, duration_ms: durationMs }
      : { last_failure_at: new Date().toISOString(), last_error: `HTTP ${response.status}`, duration_ms: durationMs }
    await upsertCronRun(jobName, values).catch((error) => {
      console.error("cron_health_finish_failed", { jobName, error: errorMessage(error) })
    })
    return response
  } catch (error) {
    await upsertCronRun(jobName, {
      last_failure_at: new Date().toISOString(),
      last_error: errorMessage(error).slice(0, 1000),
      duration_ms: Date.now() - startedAt.getTime(),
    }).catch((trackingError) => {
      console.error("cron_health_failure_record_failed", { jobName, error: errorMessage(trackingError) })
    })
    throw error
  }
}

export async function alertIfExpiryCronIsStale(): Promise<void> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("cron_runs")
    .select("job_name,last_success_at,last_alerted_at")
    .eq("job_name", "check-expiry")
    .maybeSingle<CronRun>()

  if (error) {
    console.error("cron_health_check_failed", { error: error.message })
    return
  }

  const now = Date.now()
  const lastSuccess = data?.last_success_at ? new Date(data.last_success_at).getTime() : 0
  const lastAlert = data?.last_alerted_at ? new Date(data.last_alerted_at).getTime() : 0
  if (now - lastSuccess < EXPIRY_STALE_AFTER_MS || now - lastAlert < ALERT_COOLDOWN_MS) return

  const recipient = env.appAdminEmails.split(",").map((email) => email.trim()).find(Boolean) || supportEnv.email
  const lastSuccessText = data?.last_success_at || "no successful run recorded"
  const result = await sendTransactionalEmail({
    to: recipient,
    subject: "Qalam alert: plan expiry cron is stale",
    text: [
      "The check-expiry cron has gone more than 48 hours without a successful run.",
      "",
      `Last success: ${lastSuccessText}`,
      "",
      "Check the QStash schedule, CRON_SECRET, and the cron health panel in Qalam Admin.",
    ].join("\n"),
  })

  if (result.ok) {
    await upsertCronRun("check-expiry", { last_alerted_at: new Date().toISOString() })
  }
}
