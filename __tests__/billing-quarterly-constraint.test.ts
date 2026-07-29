import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260729062305_fix_users_billing_cycle_quarterly.sql"),
  "utf8"
)

describe("users_billing_cycle_check quarterly gap fix", () => {
  it("widens the users billing_cycle constraint to match payments and payment_subscriptions", () => {
    expect(sql).toContain("drop constraint if exists users_billing_cycle_check")
    expect(sql).toContain(
      "check (billing_cycle in ('monthly', 'quarterly', 'annual'))"
    )
  })
})
