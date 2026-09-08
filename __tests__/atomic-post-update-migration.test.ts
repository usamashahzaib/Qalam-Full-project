import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync("supabase/migrations/20260907180000_atomic_post_updates.sql", "utf8").toLowerCase()

describe("atomic post update migration", () => {
  it("locks the post and refuses all edits while publishing", () => {
    expect(sql).toContain("for update")
    expect(sql).toContain("current_post.status = 'publishing'")
    expect(sql).toContain("post_is_publishing")
  })

  it("versions content and merges type into existing metadata in the transaction", () => {
    expect(sql).toContain("insert into public.post_versions")
    expect(sql).toContain("max(version_number) + 1")
    expect(sql).toContain("jsonb_set(coalesce(metadata")
    expect(sql).toContain("'{type}'")
  })

  it("is executable only by the service role", () => {
    expect(sql).toContain("revoke all on function public.update_post_atomically")
    expect(sql).toContain("grant execute on function public.update_post_atomically")
  })
})
