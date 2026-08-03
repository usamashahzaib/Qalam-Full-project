import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { CAREER_ADDON_TOOLS } from "@/lib/career-addon-tools"

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260803000000_software_only_career_addons.sql"), "utf8")
const checkout = readFileSync(resolve(process.cwd(), "lib/career-checkout.ts"), "utf8")
const payment = readFileSync(resolve(process.cwd(), "lib/server/career-addon-payments.ts"), "utf8")

describe("software-only career add-ons", () => {
  it("maps every catalog item to an in-app route", () => {
    expect(CAREER_ADD_ONS).toHaveLength(6)
    expect(CAREER_ADD_ONS.every((item) => item.route.startsWith("/career/"))).toBe(true)
    expect(CAREER_ADD_ONS.some((item) => item.key === "career_blueprint")).toBe(true)
    expect(CAREER_ADD_ONS.some((item) => String(item.key).includes("consultation"))).toBe(false)
  })

  it("defines each generated software workflow", () => {
    const keys = Object.values(CAREER_ADDON_TOOLS).map((tool) => tool.addonKey)
    expect(keys).toEqual(["interview_pack", "recruiter_review", "linkedin_rewrite", "career_blueprint"])
  })

  it("uses a generic atomic credit claim and artifact store", () => {
    expect(migration).toContain("claim_career_addon_credit")
    expect(migration).toContain("release_career_addon_credit")
    expect(migration).toContain("career_addon_artifacts")
    expect(migration).toContain("credits_consumed < quantity")
  })

  it("uses Lemon Squeezy quantity and refund events", () => {
    expect(checkout).toContain('searchParams.set("quantity"')
    expect(checkout).not.toContain('search.set("checkout[quantity]"')
    expect(payment).toContain('eventName === "order_refunded"')
    expect(payment).toContain('status: "refunded"')
  })
})
