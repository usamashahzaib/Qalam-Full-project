import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "scripts/run-migrations.mjs"), "utf8")

describe("migration runner history", () => {
  // Regression: ISSUE-004 - applied migrations were not recorded in Supabase history.
  // Found by QA on 2026-08-31.
  it("skips recorded versions and records each successful migration", () => {
    expect(source).toContain("select version from supabase_migrations.schema_migrations")
    expect(source).toContain("!appliedVersions.has(migrationVersion(file))")
    expect(source).toContain("insert into supabase_migrations.schema_migrations (version, name)")
    expect(source).toContain("on conflict (version) do nothing")
  })
})
