import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "lib/server/payments.ts"), "utf8")

describe("quarterly payment expiry", () => {
  it("uses a 90-day fallback when the provider omits period end", () => {
    expect(source).toContain('billingCycle === "quarterly" ? 90 : 30')
  })
})
