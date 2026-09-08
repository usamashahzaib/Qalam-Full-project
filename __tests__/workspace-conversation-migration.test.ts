import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync("supabase/migrations/20260907183000_workspace_scoped_conversations.sql", "utf8").toLowerCase()

describe("workspace scoped conversation migration", () => {
  it("adds the workspace relationship and lookup index", () => {
    expect(sql).toContain("add column if not exists workspace_id uuid references public.workspaces")
    expect(sql).toContain("idx_conversations_workspace_user_updated")
  })

  it("backfills only an unambiguous personal workspace", () => {
    expect(sql).toContain("workspace_count = 1")
    expect(sql).toContain("workspace_type = 'personal'")
    expect(sql).toContain("c.workspace_id is null")
  })

  it("checks workspace and user inside the append transaction", () => {
    expect(sql).toContain("append_workspace_conversation_turn")
    expect(sql).toContain("workspace_id = p_workspace_id")
    expect(sql).toContain("user_id = p_user_id")
  })
})
