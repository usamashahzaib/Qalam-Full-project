import { describe, expect, it } from "vitest"
import { authenticatedAuthRedirect } from "@/proxy"

describe("authenticated auth redirect", () => {
  it("preserves a safe destination for a signed-in user", () => {
    expect(authenticatedAuthRedirect("/career/add-ons")).toBe("/career/add-ons")
    expect(authenticatedAuthRedirect("/settings/referrals?source=pricing")).toBe("/settings/referrals?source=pricing")
  })

  it("falls back when the destination is unsafe or points to auth", () => {
    expect(authenticatedAuthRedirect("//example.com")).toBe("/dashboard")
    expect(authenticatedAuthRedirect("/login")).toBe("/dashboard")
    expect(authenticatedAuthRedirect(null)).toBe("/dashboard")
  })
})
