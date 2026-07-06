#!/usr/bin/env node
/**
 * Migration runner for Supabase.
 *
 * Usage (two options):
 *
 * Option A - Supabase Management API (recommended):
 *   SUPABASE_ACCESS_TOKEN=sbp_xxxx node scripts/run-migrations.mjs
 *   Get your access token: https://app.supabase.com/account/tokens
 *
 * Option B - Direct PostgreSQL (needs DB password):
 *   SUPABASE_DB_URL="postgresql://postgres.rnyjlgxrvtzdavsfocmi:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" node scripts/run-migrations.mjs
 *   Get the connection string: Supabase Dashboard → Project Settings → Database → Connection pooling
 *
 * Only runs migrations that are newer than what's already been applied.
 * Requires: SUPABASE_URL or SUPABASE_PROJECT_REF env var.
 */

import { readFileSync, readdirSync } from "fs"
import { resolve, join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations")

function extractProjectRef(url) {
  const m = url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
  return m?.[1] ?? null
}

async function runViaMgmtApi(projectRef, accessToken, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Management API error ${res.status}: ${body}`)
  }
  return res.json()
}

async function runViaDbUrl(dbUrl, sql) {
  // Dynamic import so the script doesn't fail if pg is not installed
  try {
    const { default: pg } = await import("pg")
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()
    await client.query(sql)
    await client.end()
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      console.error("Install pg first: npm install --save-dev pg")
    }
    throw err
  }
}

async function getMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.match(/^\d{4}_.*\.sql$/) && !f.startsWith("COMBINED"))
    .sort()
}

async function main() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const dbUrl = process.env.SUPABASE_DB_URL
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!accessToken && !dbUrl) {
    console.error("Set SUPABASE_ACCESS_TOKEN or SUPABASE_DB_URL in .env.local")
    process.exit(1)
  }

  const projectRef = extractProjectRef(supabaseUrl)
  if (accessToken && !projectRef) {
    console.error("Could not extract project ref from SUPABASE_URL:", supabaseUrl)
    process.exit(1)
  }

  const files = await getMigrationFiles()
  const targetFiles = process.argv[2] ? files.filter((f) => f >= process.argv[2]) : files

  console.log(`Running ${targetFiles.length} migration(s)...`)

  for (const file of targetFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8")
    process.stdout.write(`  ${file} ... `)
    try {
      if (accessToken) {
        await runViaMgmtApi(projectRef, accessToken, sql)
      } else {
        await runViaDbUrl(dbUrl, sql)
      }
      console.log("ok")
    } catch (err) {
      console.log("FAILED")
      console.error(`  Error: ${err.message}`)
      process.exit(1)
    }
  }

  console.log("All migrations applied.")
}

main()
