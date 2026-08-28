import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

const headers = { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

async function probeTable(table: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, { headers })
    return res.ok
  } catch {
    return false
  }
}

async function probeColumn(table: string, column: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=1`, { headers })
    return res.ok
  } catch {
    return false
  }
}

async function getRpcNames(): Promise<Set<string>> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { ...headers, Accept: "application/openapi+json" },
    })
    if (!res.ok) return new Set()
    const spec = await res.json() as { paths?: Record<string, unknown> }
    return new Set(Object.keys(spec.paths ?? {})
      .filter((path) => path.startsWith("/rpc/"))
      .map((path) => path.slice(5)))
  } catch {
    return new Set()
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const rpcNames = await getRpcNames()
  const [tables, columns] = await Promise.all([
    Promise.all([
      ["users", probeTable("users")],
      ["workspaces", probeTable("workspaces")],
      ["workspace_members", probeTable("workspace_members")],
      ["plan_usage", probeTable("plan_usage")],
      ["organizations", probeTable("organizations")],
      ["posts", probeTable("posts")],
      ["carousels", probeTable("carousels")],
      ["voice_profiles", probeTable("voice_profiles")],
      ["analytics_snapshots", probeTable("analytics_snapshots")],
      ["ai_usage", probeTable("ai_usage")],
      ["post_versions", probeTable("post_versions")],
      ["scheduling_notifications", probeTable("scheduling_notifications")],
      ["voice_examples", probeTable("voice_examples")],
      ["cron_runs", probeTable("cron_runs")],
      ["product_events", probeTable("product_events")],
    ].map(async ([name, promise]) => ({ name, exists: await (promise as Promise<boolean>) }))),
    Promise.all([
      ["users.password_version", probeColumn("users", "password_version")],
    ].map(async ([name, promise]) => ({ name, exists: await (promise as Promise<boolean>) }))),
  ])
  const rpcs = [
    "check_plan_limit",
    "increment_usage",
    "get_plan_status",
    "activate_plan",
    "provision_oauth_user",
    "get_monthly_ai_cost",
    "update_post_with_version",
    "create_personal_workspace",
  ].map((name) => ({ name, exists: rpcNames.has(name) }))

  const missingTables = tables.filter((t) => !t.exists).map((t) => t.name)
  const missingRpcs = rpcs.filter((r) => !r.exists).map((r) => r.name)
  const missingColumns = columns.filter((c) => !c.exists).map((c) => c.name)
  const allGood = missingTables.length === 0 && missingRpcs.length === 0 && missingColumns.length === 0

  return NextResponse.json({
    ok: allGood,
    tables,
    rpcs,
    columns,
    missingTables,
    missingRpcs,
    missingColumns,
    migrationSqlPath: "/supabase/migrations",
    instructions: allGood
      ? "All tables, RPCs, and columns are present."
      : [
          missingTables.length || missingRpcs.length ? "Run npx supabase db push --linked after reviewing the pending migrations." : "",
          missingColumns.length ? `Deploy the active migration that adds: ${missingColumns.join(", ")}.` : "",
        ].filter(Boolean).join(" "),
  })
}
