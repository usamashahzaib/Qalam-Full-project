import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260727071845_drop_stale_public_policies.sql"),
  "utf8"
)

describe("service-role-only RLS lockdown", () => {
  it("drops every stale public policy", () => {
    expect(sql).toContain("FROM pg_policies")
    expect(sql).toContain("WHERE schemaname = 'public'")
    expect(sql).toContain("DROP POLICY IF EXISTS")
  })

  it("keeps RLS enabled and removes client-role grants", () => {
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
    expect(sql).toContain("FROM anon, authenticated")
    expect(sql).toContain("REVOKE USAGE, CREATE ON SCHEMA public")
  })

  it("preserves server RPC execution", () => {
    expect(sql).toContain("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public")
    expect(sql).toContain("TO service_role")
  })

  it("revokes future automatic grants", () => {
    expect(sql).toContain("ALTER DEFAULT PRIVILEGES FOR ROLE postgres")
  })
})
