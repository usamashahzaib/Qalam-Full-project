#!/usr/bin/env node
/**
 * Registers QStash Schedules for cron routes that Vercel Hobby cannot run.
 *
 * Vercel Hobby allows only 2 cron jobs, both once per day (already used by
 * /api/cron/schedule and /api/linkedin/publish-scheduled in vercel.json).
 * QStash's free tier allows cron schedules at any frequency, so these
 * maintenance routes are triggered from QStash instead:
 *
 *   - /api/cron/process-queue  hourly   (recovers posts stuck in "queued")
 *   - /api/cron/cleanup-pdfs   daily    (clears expired generated PDFs)
 *   - /api/cron/check-expiry   daily    (expires plans and sends reminders)
 *   - /api/cron/career-momentum hourly  (sends opted-in daily proof reminders)
 *   - /api/cron/indexnow        daily    (submits fresh public URLs to search engines)
 *
 * Usage:
 *   QSTASH_TOKEN=qstash_xxx node scripts/setup-qstash-schedules.mjs
 *
 * QSTASH_TOKEN: Upstash Console -> QStash -> Environment (same token as the
 * Vercel env var). CRON_SECRET and FRONTEND_ORIGIN are read from the
 * environment or .env.local and must match production values.
 *
 * Safe to re-run: each schedule uses a fixed Schedule-Id, so re-running
 * updates the existing schedule instead of creating duplicates.
 */

import { readFileSync, existsSync } from "fs"
import { resolve, join, dirname } from "path"
import { fileURLToPath } from "url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function loadDotEnvLocal() {
  const file = join(ROOT, ".env.local")
  if (!existsSync(file)) return {}
  const vars = {}
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return vars
}

const dotenv = loadDotEnvLocal()
const envVar = (name) => process.env[name] || dotenv[name] || ""

const QSTASH_TOKEN = envVar("QSTASH_TOKEN")
const QSTASH_URL = (envVar("QSTASH_URL") || "https://qstash.upstash.io").replace(/\/$/, "")
const CRON_SECRET = envVar("CRON_SECRET")
const ORIGIN = (envVar("FRONTEND_ORIGIN") || envVar("NEXT_PUBLIC_SITE_URL") || "https://byqalam.com").replace(/\/$/, "")

if (!QSTASH_TOKEN) {
  console.error("Missing QSTASH_TOKEN. Copy it from the Upstash Console (QStash tab) and run:")
  console.error("  QSTASH_TOKEN=qstash_xxx node scripts/setup-qstash-schedules.mjs")
  process.exit(1)
}
if (!CRON_SECRET) {
  console.error("Missing CRON_SECRET (set it in the environment or .env.local). It must match the production value.")
  process.exit(1)
}

const SCHEDULES = [
  {
    scheduleId: "qalam-process-queue-hourly",
    path: "/api/cron/process-queue",
    cron: "0 * * * *",
  },
  {
    scheduleId: "qalam-cleanup-pdfs-daily",
    path: "/api/cron/cleanup-pdfs",
    cron: "0 2 * * *",
  },
  {
    scheduleId: "qalam-check-expiry-daily",
    path: "/api/cron/check-expiry",
    cron: "30 1 * * *",
  },
  {
    scheduleId: "qalam-career-momentum-hourly",
    path: "/api/cron/career-momentum",
    cron: "15 * * * *",
  },
  {
    scheduleId: "qalam-indexnow-daily",
    path: "/api/cron/indexnow",
    cron: "0 3 * * *",
  },
]

async function upsertSchedule({ scheduleId, path, cron }) {
  const destination = `${ORIGIN}${path}`
  const res = await fetch(`${QSTASH_URL}/v2/schedules/${destination}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Upstash-Schedule-Id": scheduleId,
      "Upstash-Cron": cron,
      // Cron routes are GET handlers; QStash delivers POST unless overridden.
      "Upstash-Method": "GET",
      // Forwarded to the destination as a normal Authorization header,
      // satisfying the routes' existing Bearer CRON_SECRET check.
      "Upstash-Forward-Authorization": `Bearer ${CRON_SECRET}`,
      "Upstash-Retries": "2",
    },
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${scheduleId}: HTTP ${res.status} ${body}`)
  console.log(`ok: ${scheduleId} -> GET ${destination} (${cron})`)
}

for (const schedule of SCHEDULES) {
  await upsertSchedule(schedule)
}
console.log("Done. Verify under Upstash Console -> QStash -> Schedules.")
