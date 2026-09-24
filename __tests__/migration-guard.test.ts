import { describe, expect, it } from "vitest"
import { UnappliedMigrationsError, exitCodeFor } from "../scripts/migration-guard-policy.mjs"

describe("prebuild migration guard", () => {
  it("always blocks the build when migrations are definitely unapplied", () => {
    const error = new UnappliedMigrationsError(["20260924140000"])
    expect(exitCodeFor(error, false)).toBe(1)
    expect(exitCodeFor(error, true)).toBe(1)
    expect(error.message).toContain("20260924140000")
  })

  it("tolerates a check that could not run unless a check is required", () => {
    const networkFailure = new Error("getaddrinfo ENOTFOUND db.example.supabase.co")
    expect(exitCodeFor(networkFailure, false)).toBe(0)
    expect(exitCodeFor(networkFailure, true)).toBe(1)
  })
})
