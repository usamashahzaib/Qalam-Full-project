#!/usr/bin/env node
/**
 * RLS audit for the live database.
 *
 * Migration files are not the source of truth for policy state: policies can be
 * created straight from the Supabase dashboard, and a later migration can widen
 * one an earlier migration narrowed (which is exactly how 0024 and 0026 undid
 * the correct policies in schema_final.sql). This queries the database.
 *
 * Flags two classes of problem:
 *   1. A policy whose roles include PUBLIC. Postgres applies these to every
 *      role, including Supabase's anon and authenticated. service_role bypasses
 *      RLS outright, so a policy that exists "for the service role" is always
 *      either a no-op or an accidental grant to the anon key.
 *   2. A policy with a qual or check of "true" on a table holding user data.
 *
 * Also reports which tables anon and authenticated still hold grants on, since
 * a revoked grant makes the policy set irrelevant and is the stronger control.
 *
 * Usage:
 *   node scripts/check-rls.mjs
 *
 * Reads SUPABASE_ACCESS_TOKEN (or SUPABASE_DB_URL) and SUPABASE_URL from
 * .env.local or the environment, same as scripts/run-migrations.mjs.
 * Exits non-zero when anything is flagged, so it can gate CI.
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

// Tables that only ever get touched by the service role. A grant to anon or
// authenticated on any of these is a finding on its own.
const SERVICE_ONLY_TABLES = [
  "user_overrides",
  "plan_usage",
  "approvals",
  "payments",
  "payment_subscriptions",
  "linkedin_credentials",
  "email_verifications",
  "admin_audit_log",
  "workspace_usage",
  "workspace_invites",
]

function loadEnv() {
  const env = { ...process.env }
  try {
    for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["'](.*)["']$/, "$1").trim()
    }
  } catch {
    // .env.local is optional when the values are already exported
  }
  return env
}

const extractProjectRef = (url) => url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null

async function queryViaMgmtApi(projectRef, accessToken, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`Management API error ${res.status}: ${await res.text()}`)
  return res.json()
}

async function queryViaDbUrl(dbUrl, sql) {
  const { default: pg } = await import("pg").catch(() => {
    throw new Error("Install pg first: npm install --save-dev pg")
  })
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    return (await client.query(sql)).rows
  } finally {
    await client.end()
  }
}

const POLICY_SQL = `
  SELECT tablename, policyname, roles::text AS roles, cmd,
         COALESCE(qual, '') AS qual, COALESCE(with_check, '') AS with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
`

const GRANT_SQL = `
  SELECT table_name, grantee, string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type) AS privileges
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  GROUP BY table_name, grantee
  ORDER BY table_name, grantee;
`

async function main() {
  const env = loadEnv()
  const accessToken = env.SUPABASE_ACCESS_TOKEN
  const dbUrl = env.SUPABASE_DB_URL
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL

  if (!accessToken && !dbUrl) {
    console.error("Set SUPABASE_ACCESS_TOKEN or SUPABASE_DB_URL in .env.local or the environment.")
    console.error("Access token: https://app.supabase.com/account/tokens")
    process.exit(1)
  }

  const projectRef = extractProjectRef(supabaseUrl)
  if (accessToken && !projectRef) {
    console.error(`Could not extract a project ref from SUPABASE_URL: ${supabaseUrl}`)
    process.exit(1)
  }

  const run = (sql) => (accessToken ? queryViaMgmtApi(projectRef, accessToken, sql) : queryViaDbUrl(dbUrl, sql))

  const policies = await run(POLICY_SQL)
  const grants = await run(GRANT_SQL)

  const findings = []

  for (const p of policies) {
    const rolesRaw = String(p.roles ?? "")
    const appliesToPublic = /\bpublic\b/.test(rolesRaw)
    const permissive = p.qual?.trim() === "true" || p.with_check?.trim() === "true"

    if (appliesToPublic && permissive) {
      findings.push(`CRITICAL  ${p.tablename}.${p.policyname} [${p.cmd}] applies to PUBLIC with an unconditional true`)
    } else if (appliesToPublic) {
      findings.push(`WARN      ${p.tablename}.${p.policyname} [${p.cmd}] applies to PUBLIC (roles ${rolesRaw})`)
    } else if (permissive) {
      findings.push(`NOTE      ${p.tablename}.${p.policyname} [${p.cmd}] is unconditional (scoped to ${rolesRaw})`)
    }
  }

  for (const g of grants) {
    if (SERVICE_ONLY_TABLES.includes(g.table_name)) {
      findings.push(`CRITICAL  ${g.table_name} still grants ${g.privileges} to ${g.grantee}`)
    }
  }

  console.log(`Policies in public schema: ${policies.length}`)
  console.log(`anon/authenticated table grants: ${grants.length}`)
  console.log("")

  const locked = SERVICE_ONLY_TABLES.filter(
    (t) => !policies.some((p) => p.tablename === t) && !grants.some((g) => g.table_name === t)
  )
  if (locked.length) {
    console.log("Service-role only, no policies and no grants (correct):")
    for (const t of locked) console.log(`  ok  ${t}`)
    console.log("")
  }

  if (!findings.length) {
    console.log("No RLS findings.")
    return
  }

  console.log(`${findings.length} finding(s):`)
  for (const f of findings) console.log(`  ${f}`)
  console.log("")
  console.log("A policy that exists 'for the service role' is always wrong: service_role bypasses")
  console.log("RLS, so the policy only ever grants access to anon and authenticated. Drop the")
  console.log("policy and REVOKE ALL on the table from anon, authenticated instead.")
  process.exitCode = 1
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
