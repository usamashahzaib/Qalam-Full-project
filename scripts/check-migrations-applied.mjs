#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const migrationsDir = join(root, "supabase", "migrations")
const required = process.env.REQUIRE_MIGRATION_CHECK === "1"

function loadLocalEnvironment() {
  const localEnvPath = join(root, ".env.local")
  if (!existsSync(localEnvPath)) return
  for (const line of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1").trim()
  }
}

const migrationVersions = () => readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file) && !file.startsWith("COMBINED"))
  .sort()
  .map((file) => file.split("_")[0])

async function queryWithDatabaseUrl(databaseUrl) {
  const { default: pg } = await import("pg")
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const result = await client.query("select version from supabase_migrations.schema_migrations")
    return result.rows.map((row) => String(row.version))
  } finally {
    await client.end()
  }
}

async function queryWithManagementApi(accessToken, supabaseUrl) {
  const projectRef = supabaseUrl?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  if (!projectRef) throw new Error("SUPABASE_URL must identify a Supabase project")
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query: "select version from supabase_migrations.schema_migrations" }),
  })
  if (!response.ok) throw new Error(`Supabase migration-history query failed with ${response.status}`)
  const payload = await response.json()
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.result) ? payload.result : []
  return rows.map((row) => String(row.version))
}

async function main() {
  loadLocalEnvironment()
  const databaseUrl = process.env.SUPABASE_DB_URL
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!databaseUrl && !accessToken) {
    const message = "Migration verification skipped because no Supabase database credential is available."
    if (required) throw new Error(message)
    console.log(message)
    return
  }

  const applied = new Set(
    databaseUrl
      ? await queryWithDatabaseUrl(databaseUrl)
      : await queryWithManagementApi(accessToken, supabaseUrl),
  )
  const missing = migrationVersions().filter((version) => !applied.has(version))
  if (missing.length) throw new Error(`Unapplied Supabase migrations: ${missing.join(", ")}`)
  console.log(`Migration verification passed: ${applied.size} applied migration(s).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
