import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { CAREER_ADDON_TOOLS } from "@/lib/career-addon-tools"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260803000000_software_only_career_addons.sql"), "utf8")
const commerceMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260817100306_career_commerce_credits_and_packs.sql"), "utf8")
const checkout = readFileSync(resolve(process.cwd(), "lib/career-checkout.ts"), "utf8")
const lemonApi = readFileSync(resolve(process.cwd(), "lib/server/lemonsqueezy-api.ts"), "utf8")
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
  })

  it("blocks unconfigured checkout before creating an order", () => {
    expect(orderRoute.indexOf("isCareerAddonCheckoutConfigured")).toBeLessThan(orderRoute.indexOf('.from("career_addon_orders").insert'))
    expect(orderRoute).toContain("Card checkout is not configured")
    expect(marketplace).toContain('disabled={!checkoutReady || payingKey === item.key}')
  })

  it("supports discounted packs and weighted plan credits atomically", () => {
    expect(commerceMigration).toContain("p_credit_keys text[]")
    expect(commerceMigration).toContain("addon_key = 'career_credit'")
    expect(commerceMigration).toContain("when 'linkedin_rewrite' then 3")
    expect(commerceMigration).toContain("on conflict (user_id, source_type, source_reference) do nothing")
  })
})

// The webhook fulfillment/refund handler below is a pure function of
// (rawBody, signature, eventName) -> { status, body }, so it's tested by
// calling it directly with crafted Lemon Squeezy payloads rather than via
// source inspection - this actually exercises the amount/variant/quantity
// integrity checks instead of just confirming their text is present.

const { verifyLemonSqueezy } = vi.hoisted(() => ({ verifyLemonSqueezy: vi.fn(() => true) }))
vi.mock("@/lib/server/payments", () => ({ verifyLemonSqueezy }))

const { verifyAddonCheckoutToken } = vi.hoisted(() => ({ verifyAddonCheckoutToken: vi.fn() }))
vi.mock("@/lib/server/checkout-token", () => ({ verifyAddonCheckoutToken }))

const { createServiceClient, supabaseSelect } = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  supabaseSelect: vi.fn(),
}))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient, supabaseSelect }))

const { createNotification } = vi.hoisted(() => ({ createNotification: vi.fn() }))
vi.mock("@/lib/server/notifications", () => ({ createNotification }))

const { getCareerAddonKeyForVariantId } = vi.hoisted(() => ({ getCareerAddonKeyForVariantId: vi.fn() }))
vi.mock("@/lib/server/career-addon-variants", () => ({ getCareerAddonKeyForVariantId }))

const ORDER: Record<string, unknown> = {
  id: "order-1",
  user_id: "user-1",
  workspace_id: "ws-1",
  addon_key: "career_blueprint",
  quantity: 1,
  amount_pkr: 5000,
  status: "pending",
}

const rpc = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  verifyLemonSqueezy.mockReturnValue(true)
  verifyAddonCheckoutToken.mockReturnValue({ orderId: "order-1", userId: "user-1" })
  getCareerAddonKeyForVariantId.mockReturnValue("career_blueprint")
  supabaseSelect.mockResolvedValue([{ ...ORDER }])
  rpc.mockImplementation(async (name: string) => {
    if (name === "claim_payment_webhook_v2") return { data: "claimed", error: null }
    if (name === "fulfill_career_purchase") return { data: true, error: null }
    return { data: null, error: null }
  })
  createServiceClient.mockReturnValue({ ...createFakeSupabase({ tableResponses: { payment_webhook_events: () => ok(null) } }), rpc })
})

const orderCreatedPayload = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  meta: { event_name: "order_created", custom_data: { kind: "career_addon", token: "tok" } },
  data: {
    id: "ls-order-1",
    attributes: {
      status: "paid",
      currency: "PKR",
      subtotal: 500000, // amount_pkr(5000) * 100
      discount_total: 0,
      first_order_item: { variant_id: "v-1", quantity: 1 },
      ...overrides,
    },
  },
})

describe("career add-on webhook fulfillment integrity", () => {
  it("verifies add-on variant, PKR subtotal, and quantity before fulfillment", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")

    const res = await handleCareerAddonWebhook(orderCreatedPayload(), "sig", "order_created")

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith("fulfill_career_purchase", expect.objectContaining({ p_order_id: "order-1" }))
  })

  it("rejects a paid variant that doesn't match the reserved order's addon", async () => {
    getCareerAddonKeyForVariantId.mockReturnValue("interview_pack") // order reserved career_blueprint
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")

    const res = await handleCareerAddonWebhook(orderCreatedPayload(), "sig", "order_created")

    expect(res.body).toMatchObject({ ok: false, error: "addon_variant_mismatch" })
    expect(rpc).not.toHaveBeenCalledWith("fulfill_career_purchase", expect.anything())
  })

  it("rejects a subtotal that doesn't match the reserved order's price", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")

    const res = await handleCareerAddonWebhook(orderCreatedPayload({ subtotal: 100000 }), "sig", "order_created")

    expect(res.body).toMatchObject({ ok: false, error: "addon_amount_mismatch" })
  })

  it("rejects a non-PKR currency even if the subtotal number matches", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")

    const res = await handleCareerAddonWebhook(orderCreatedPayload({ currency: "USD" }), "sig", "order_created")

    expect(res.body).toMatchObject({ ok: false, error: "addon_amount_mismatch" })
  })

  it("fulfills a discounted order - a coupon lowers discount_total, never the pre-discount subtotal that's actually checked", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")

    const res = await handleCareerAddonWebhook(
      orderCreatedPayload({ discount_total: 50000 }), // 50% off - subtotal unchanged
      "sig",
      "order_created"
    )

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it("rejects a quantity that doesn't match what was reserved", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")

    const res = await handleCareerAddonWebhook(
      orderCreatedPayload({ first_order_item: { variant_id: "v-1", quantity: 3 } }),
      "sig",
      "order_created"
    )

    expect(res.body).toMatchObject({ ok: false, error: "addon_quantity_mismatch" })
  })
})
