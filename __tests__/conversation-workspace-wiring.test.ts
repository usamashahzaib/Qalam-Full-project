import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const files = [
  "app/api/chat/conversations/route.ts",
  "app/api/chat/messages/route.ts",
  "app/api/strategist/route.ts",
  "app/api/strategist/chat/route.ts",
].map((path) => readFileSync(path, "utf8"))

describe("conversation workspace wiring", () => {
  it("scopes every conversation route to the resolved workspace", () => {
    for (const source of files) expect(source).toContain('"workspace_id", planCheck.workspaceId')
  })

  it("uses workspace-aware write transactions", () => {
    for (const source of files.slice(2)) {
      expect(source).toContain("create_workspace_conversation_with_message")
      expect(source).toContain("append_workspace_conversation_turn")
      expect(source).toContain("p_workspace_id: planCheck.workspaceId")
    }
  })

  it("passes workspace identity for browser message, rename and delete calls", () => {
    const source = readFileSync("app/(app)/chat/page.tsx", "utf8")
    expect(source.match(/workspaceKey/g)?.length).toBeGreaterThanOrEqual(5)
  })
})
