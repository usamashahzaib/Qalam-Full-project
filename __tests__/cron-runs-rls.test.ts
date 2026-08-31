import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260831140000_lock_cron_runs_to_service_role.sql"),
  "utf8",
).toLowerCase()

describe("cron run security", () => {
  // Regression: ISSUE-003 - service-only cron data had a public RLS policy.
  // Found by QA on 2026-08-31.
  it("removes the public policy and client-role table access", () => {
    expect(migration).toContain('drop policy if exists "cron_runs_service_only"')
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("revoke all on table public.cron_runs from anon, authenticated")
  })
})
