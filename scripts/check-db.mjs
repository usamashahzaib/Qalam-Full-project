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

async function checkRpc(fn, body = {}) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, body: text.slice(0, 120) }
}

console.log("=== TABLE STATUS ===")
const tables = ["users","workspaces","workspace_members","plan_usage","organizations","posts","carousels","voice_profiles","ai_usage","post_versions","analytics_snapshots","scheduling_notifications","voice_examples"]
for (const t of tables) {
  const r = await checkTable(t)
  console.log(`  ${r.ok ? "OK  " : "MISS"} ${t} (${r.status})`)
}

console.log("\n=== RPC STATUS ===")
const rpcs = [
  ["check_plan_limit", { p_user_id: "00000000-0000-0000-0000-000000000000", p_feature: "drafts" }],
  ["increment_usage", { p_user_id: "00000000-0000-0000-0000-000000000000", p_feature: "drafts" }],
  ["get_plan_status", { p_user_id: "00000000-0000-0000-0000-000000000000" }],
  ["activate_plan", { p_organization_id: "00000000-0000-0000-0000-000000000000", p_plan_name: "Pro", p_expires_at: null }],
  ["provision_oauth_user", { p_external_user_id: "test", p_email: "test@test.com", p_full_name: "Test", p_image_url: null }],
  ["get_monthly_ai_cost", { p_user_id: "00000000-0000-0000-0000-000000000000" }],
  ["update_post_with_version", { p_post_id: "00000000-0000-0000-0000-000000000000", p_content: "test", p_author_id: "00000000-0000-0000-0000-000000000000" }],
  ["create_personal_workspace", { p_user_id: "00000000-0000-0000-0000-000000000000", p_name: "Personal" }],
]
for (const [fn, body] of rpcs) {
  const r = await checkRpc(fn, body)
  const status = r.status === 404 ? "MISS" : r.status === 200 ? "OK  " : `HTTP_${r.status}`
  console.log(`  ${status} rpc/${fn} - ${r.body.slice(0,80)}`)
}
