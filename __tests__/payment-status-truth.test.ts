import { describe, expect, it } from "vitest"
import { LIVE_SURFACE } from "@/lib/marketing-content"

describe("public payment status truth", () => {
  const byTitle = Object.fromEntries(LIVE_SURFACE.map((section) => [section.title, section.items]))

  it("marks self-serve card checkout and activation live", () => {
    expect(byTitle["Live now"]).toEqual(expect.arrayContaining([
      "Self-serve Solo and Pro card checkout",
      "Automatic plan activation after card payment",
    ]))
  })

  it("keeps only local transfer verification manual", () => {
    expect(byTitle["Active workflows"]).toEqual(expect.arrayContaining([
      "JazzCash, Easypaisa, and bank transfer verification",
      "Manual activation for local transfer payments",
    ]))
  })

  it("does not present self-serve checkout as future work", () => {
    expect(byTitle["Building next"]).not.toContain("Self-serve checkout")
  })

  it("marks notifications and referrals live", () => {
    expect(byTitle["Live now"]).toEqual(expect.arrayContaining([
      "Notification center with unread status and history",
      "Refer and Earn codes, discounts, commissions, and payouts",
    ]))
    expect(byTitle["Building next"]).not.toContain("Notification center")
  })
})
