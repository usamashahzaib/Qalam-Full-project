import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260729065959_harden_identity_publishing_career_usage.sql"),
  "utf8"
).toLowerCase()

describe("production hardening migration", () => {
  it("enforces internal UUID workspace identities", () => {
    expect(migration).toContain("alter column user_id type uuid")
    expect(migration).toContain("alter column owner_id type uuid")
    expect(migration).toContain("workspace_members_user_id_fkey")
    expect(migration).toContain("workspaces_owner_id_fkey")
  })

  it("claims and releases manual LinkedIn publishing atomically", () => {
    expect(migration).toContain("claim_manual_linkedin_publish")
    expect(migration).toContain("release_manual_linkedin_publish")
    expect(migration).toContain("finalize_manual_linkedin_publish")
    expect(migration).toContain("for update;")
  })

  it("tracks every purchased resume credit", () => {
    expect(migration).toContain("credits_consumed < quantity")
    expect(migration).toContain("claim_extra_resume_credit")
    expect(migration).toContain("release_extra_resume_credit")
  })

  it("supports quota compensation and atomic resume versions", () => {
    expect(migration).toContain("refund_career_usage")
    expect(migration).toContain("pg_advisory_xact_lock")
    expect(migration).toContain("append_resume_version")
  })

  it("keeps privileged RPCs service-role only", () => {
    expect(migration).toContain("security invoker")
    expect(migration).not.toContain("security definer")
    expect(migration).toContain("grant execute on function public.claim_manual_linkedin_publish")
  })
})
