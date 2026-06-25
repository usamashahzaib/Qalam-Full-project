import { NextRequest, NextResponse } from "next/server"
import { isAdminEmail } from "@/lib/server/workspace"
import { withAuth } from "@/lib/server/auth"

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

const headers = { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }

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

async function probeRpc(fn: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    // 404 = doesn't exist. Anything else (even 400) = exists with wrong params = OK
    return res.status !== 404
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const [tables, rpcs, columns] = await Promise.all([
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
      ].map(async ([name, promise]) => ({ name, exists: await (promise as Promise<boolean>) }))),
      Promise.all([
        ["check_plan_limit", probeRpc("check_plan_limit", { p_user_id: "00000000-0000-0000-0000-000000000000", p_feature: "drafts" })],
        ["increment_usage", probeRpc("increment_usage", { p_user_id: "00000000-0000-0000-0000-000000000000", p_feature: "drafts" })],
        ["get_plan_status", probeRpc("get_plan_status", { p_user_id: "00000000-0000-0000-0000-000000000000" })],
        ["activate_plan", probeRpc("activate_plan", { p_organization_id: "00000000-0000-0000-0000-000000000000", p_plan_name: "Pro", p_expires_at: null })],
        ["provision_oauth_user", probeRpc("provision_oauth_user", { p_external_user_id: "x", p_email: "x@x.com", p_full_name: "x", p_image_url: null })],
        ["get_monthly_ai_cost", probeRpc("get_monthly_ai_cost", { p_user_id: "00000000-0000-0000-0000-000000000000" })],
        ["update_post_with_version", probeRpc("update_post_with_version", { p_post_id: "00000000-0000-0000-0000-000000000000", p_workspace_id: "00000000-0000-0000-0000-000000000000", p_new_content: "x", p_created_by: "00000000-0000-0000-0000-000000000000" })],
        ["create_personal_workspace", probeRpc("create_personal_workspace", { p_user_id: "00000000-0000-0000-0000-000000000000", p_name: "Personal" })],
      ].map(async ([name, promise]) => ({ name, exists: await (promise as Promise<boolean>) }))),
      Promise.all([
        ["users.password_version", probeColumn("users", "password_version")],
      ].map(async ([name, promise]) => ({ name, exists: await (promise as Promise<boolean>) }))),
    ])

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
      migrationSqlPath: "/supabase/migrations/COMBINED_NEW_MIGRATIONS.sql",
      instructions: allGood
        ? "All tables, RPCs, and columns are present."
        : [
            missingTables.length || missingRpcs.length ? "Run COMBINED_NEW_MIGRATIONS.sql in Supabase Dashboard > SQL Editor." : "",
            missingColumns.length ? `Run 0040_password_version.sql to add missing columns: ${missingColumns.join(", ")}.` : "",
          ].filter(Boolean).join(" "),
    })
  })(request)
}
