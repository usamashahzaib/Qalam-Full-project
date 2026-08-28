import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828120000_voice_profiles_workspace_unique.sql"),
  "utf8",
).toLowerCase()

describe("voice profile workspace uniqueness migration", () => {
  it("keeps one profile per workspace before adding the upsert index", () => {
    expect(migration).toContain("partition by workspace_id")
    expect(migration).toContain("delete from public.voice_profiles")
    expect(migration).toContain("create unique index if not exists voice_profiles_workspace_id_unique_idx")
  })
})
