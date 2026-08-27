import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("career momentum contracts", () => {
  it("keeps one daily signal per user and workspace", () => {
    const migration = read("supabase/migrations/20260824160000_career_momentum_loop.sql")
    expect(migration).toContain("unique (workspace_id, user_id, signal_date)")
    expect(migration).toContain("unique (workspace_id, user_id)")
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("revoke all on public.career_daily_signals from anon, authenticated")
  })

  it("workspace scopes both reads and writes", () => {
    const route = read("app/api/career/momentum/route.ts")
    const server = read("lib/server/career-momentum.ts")
    expect(route).toContain("createScopedClient(planCheck.workspaceId)")
    expect(route).toContain('authorizeRole(req, planCheck.workspaceId, "editor")')
    expect(server).toContain("createScopedClient(workspaceId)")
    expect(server).toContain('.eq("user_id", userId)')
  })

  it("describes momentum without claiming employability", () => {
    const server = read("lib/server/career-momentum.ts")
    expect(server).toContain("It is not an employability score.")
  })

  it("sends reminders only through the authenticated opt-in cron", () => {
    const cron = read("app/api/cron/career-momentum/route.ts")
    const setup = read("scripts/setup-qstash-schedules.mjs")
    expect(cron).toContain("verifyCronAuth(request)")
    expect(cron).toContain('.eq("reminder_enabled", true)')
    expect(cron).toContain('.eq("signal_date", localDate)')
    expect(cron).toContain("last_reminded_on: localDate")
    expect(setup).toContain("qalam-career-momentum-hourly")
  })
})
