import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { CAREER_ADDON_TOOLS } from "@/lib/career-addon-tools"

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260803000000_software_only_career_addons.sql"), "utf8")
const commerceMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260817100306_career_commerce_credits_and_packs.sql"), "utf8")
const checkout = readFileSync(resolve(process.cwd(), "lib/career-checkout.ts"), "utf8")
const lemonApi = readFileSync(resolve(process.cwd(), "lib/server/lemonsqueezy-api.ts"), "utf8")
const payment = readFileSync(resolve(process.cwd(), "lib/server/career-addon-payments.ts"), "utf8")
const orderRoute = readFileSync(resolve(process.cwd(), "app/api/career/add-ons/route.ts"), "utf8")
const marketplace = readFileSync(resolve(process.cwd(), "app/(app)/career/add-ons/page.tsx"), "utf8")

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
    expect(checkout).toContain("NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE")
    expect(lemonApi).toContain("variant_quantities")
    expect(lemonApi).toContain("getCareerAddonVariantId(params.addonKey)")
    expect(payment).toContain('eventName === "order_refunded"')
    expect(payment).toContain('supabase.rpc("refund_career_purchase"')
  })

  it("blocks unconfigured checkout before creating an order", () => {
    expect(orderRoute.indexOf("isCareerAddonCheckoutConfigured")).toBeLessThan(orderRoute.indexOf('.from("career_addon_orders").insert'))
    expect(orderRoute).toContain("Card checkout is not configured")
    expect(marketplace).toContain('disabled={!checkoutReady || payingKey === item.key}')
  })

  it("verifies add-on variant, PKR subtotal, and quantity before fulfillment", () => {
    expect(payment).toContain("getCareerAddonKeyForVariantId")
    expect(payment).toContain("addon_variant_mismatch")
    expect(payment).toContain('currency !== "PKR"')
    expect(payment).toContain("subtotal !== order.amount_pkr * 100")
    expect(payment.indexOf("addon_amount_mismatch")).toBeLessThan(payment.indexOf('supabase.rpc("fulfill_career_purchase"'))
  })

  it("fulfills discounted orders - a coupon lowers total, never the pre-discount subtotal", () => {
    // The integrity check compares the pre-discount subtotal to the catalog price, so a
    // merchant coupon must still fulfil. Rejecting on a non-zero discount_total would charge
    // the customer and never grant credits (orphan payment), so that guard must NOT exist.
    expect(payment).not.toContain("discountTotal !== 0")
  })

  it("supports discounted packs and weighted plan credits atomically", () => {
    expect(commerceMigration).toContain("p_credit_keys text[]")
    expect(commerceMigration).toContain("addon_key = 'career_credit'")
    expect(commerceMigration).toContain("when 'linkedin_rewrite' then 3")
    expect(commerceMigration).toContain("on conflict (user_id, source_type, source_reference) do nothing")
  })
})
