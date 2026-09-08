import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync("supabase/migrations/20260907190000_publish_outcome_review.sql", "utf8").toLowerCase()

describe("publish outcome review transaction", () => {
  it("only resolves rows that remain in publishing", () => {
    expect(sql).toContain("where id = p_post_id and status = 'publishing'")
    expect(sql).toContain("get diagnostics updated_rows = row_count")
  })
  it("accepts only explicit verified resolutions", () => {
    expect(sql).toContain("p_resolution not in ('published', 'not_published')")
    expect(sql).toContain("manually_verified_not_published")
  })
  it("keeps the operation service-role only", () => {
    expect(sql).toContain("revoke all on function public.resolve_publish_outcome_review")
    expect(sql).toContain("to service_role")
  })
})
