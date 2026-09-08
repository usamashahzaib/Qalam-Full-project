import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync("supabase/migrations/20260907193000_validate_atomic_post_type.sql", "utf8").toLowerCase()

describe("atomic post type validation", () => {
  it("rejects empty and oversized types while preserving atomic update behavior", () => {
    expect(sql).toContain("invalid_post_type")
    expect(sql).toContain("length(p_patch ->> 'type') > 80")
    expect(sql).toContain("for update")
    expect(sql).toContain("insert into public.post_versions")
  })
})
