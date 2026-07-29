#!/usr/bin/env node
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

// Parse .env.local
const envLines = readFileSync(resolve(ROOT, ".env.local"), "utf-8").split("\n")
const env = {}
for (const line of envLines) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").trim()
}

const URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY

async function checkTable(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY }
  })
  return { status: res.status, ok: res.ok }
}

async function getRpcNames() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, Accept: "application/openapi+json" },
  })
  if (!res.ok) throw new Error(`OpenAPI probe failed (${res.status})`)
  const spec = await res.json()
  return new Set(Object.keys(spec.paths || {})
    .filter((path) => path.startsWith("/rpc/"))
    .map((path) => path.slice(5)))
}

console.log("=== TABLE STATUS ===")
const tables = ["users","workspaces","workspace_members","plan_usage","organizations","posts","carousels","voice_profiles","ai_usage","post_versions","analytics_snapshots","scheduling_notifications","voice_examples"]
for (const t of tables) {
  const r = await checkTable(t)
  console.log(`  ${r.ok ? "OK  " : "MISS"} ${t} (${r.status})`)
}

console.log("\n=== RPC STATUS ===")
const rpcs = [
  "check_plan_limit",
  "increment_usage",
  "get_plan_status",
  "activate_plan",
  "provision_oauth_user",
  "get_monthly_ai_cost",
  "update_post_with_version",
  "create_personal_workspace",
]
const rpcNames = await getRpcNames()
for (const fn of rpcs) {
  console.log(`  ${rpcNames.has(fn) ? "OK  " : "MISS"} rpc/${fn}`)
}
