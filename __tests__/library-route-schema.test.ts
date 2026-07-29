import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const route = readFileSync(resolve(process.cwd(), "app/api/library/route.ts"), "utf8")

describe("library route schema", () => {
  it("queries only canonical post columns", () => {
    expect(route).not.toContain('"deleted_at"')
    expect(route).not.toContain('ilike("type"')
    expect(route).toContain('"metadata->>type"')
  })
})
