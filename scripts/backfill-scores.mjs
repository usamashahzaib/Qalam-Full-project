#!/usr/bin/env node
// One-off backfill: scores every existing post with a NULL engagement_score
// by repeatedly calling POST /api/admin/backfill-scores until nothing is left.
// Needed because engagement_score was never written on post save until this
// fix landed - old posts have no score, so the dashboard's average was empty.
//
// Usage:
//   node scripts/backfill-scores.mjs [baseUrl] [batchSize]
//
// baseUrl defaults to http://localhost:3000 (start `npm run dev` first), or
// pass your deployed URL to run it against production/staging. CRON_SECRET is
// read from .env.local and must match the value configured on that deployment.

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

function loadEnv() {
  try {
    const lines = readFileSync(resolve(ROOT, ".env.local"), "utf-8").split("\n")
    const env = {}
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").trim()
    }
    return env
  } catch {
    return {}
  }
}

const env = loadEnv()
const CRON_SECRET = process.env.CRON_SECRET || env.CRON_SECRET
if (!CRON_SECRET) {
  console.error("Missing CRON_SECRET (set it in the environment or .env.local). It must match the target deployment's value.")
  process.exit(1)
}

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "")
const batchSize = Number(process.argv[3]) || 15

async function runBatch() {
  const res = await fetch(`${baseUrl}/api/admin/backfill-scores?limit=${batchSize}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return JSON.parse(text)
}

async function main() {
  console.log(`Backfilling post scores against ${baseUrl} (batch size ${batchSize})`)
  let totalScored = 0
  let totalSkipped = 0
  let totalFailed = 0
  let round = 0

  for (;;) {
    round += 1
    const result = await runBatch()
    totalScored += result.scored
    totalSkipped += result.skipped
    totalFailed += result.failed
    console.log(
      `  round ${round}: scanned=${result.scanned} scored=${result.scored} skipped=${result.skipped} failed=${result.failed} remaining=${result.remaining}`
    )
    if (result.scanned === 0 || result.remaining === 0) break
    // Small pause between rounds to stay friendly to AI provider rate limits.
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\nDone. scored=${totalScored} skipped=${totalSkipped} failed=${totalFailed}`)
  if (totalFailed > 0) {
    console.log("Some posts failed to score (AI provider errors) - re-run the script to retry them.")
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err.message)
  process.exit(1)
})
