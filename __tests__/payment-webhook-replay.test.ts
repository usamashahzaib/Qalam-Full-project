import { createHmac } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Behavioral replay coverage for the career add-on webhook.
 *
 * The idempotency guarantee lived only in SQL (claim_payment_webhook_v2) and in
 * prose in docs/SYSTEM-DESIGN.md. Nothing asserted that the handler actually
 * honours the claim states, so a refactor that ignored the RPC result would have
 * shipped green. These tests drive the real handler and assert that a redelivered
 * event grants nothing a second time.
 */

const WEBHOOK_SECRET = "test-webhook-secret"

const { rpc, from, supabaseSelect, createNotification } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  supabaseSelect: vi.fn(),
  createNotification: vi.fn(),
}))

vi.mock("@/lib/server/supabase-rest", () => ({
  createServiceClient: () => ({ rpc, from }),
  supabaseSelect,
}))
vi.mock("@/lib/server/notifications", () => ({ createNotification }))
vi.mock("@/lib/server/env", () => ({
  env: { lemonSqueezyWebhookSecret: WEBHOOK_SECRET, frontendOrigin: "https://app.byqalam.test" },
}))
vi.mock("@/lib/server/logging", () => ({ log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

const updateChain = () => {
  const chain: Record<string, unknown> = {}
  for (const method of ["update", "eq", "select", "maybeSingle"]) {
    chain[method] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn(async () => ({ data: null }))
  return chain
}

const body = (eventName: string, orderId: string) => JSON.stringify({
  meta: { event_name: eventName, custom_data: { token: "addon-token" } },
  data: {
    id: orderId,
    attributes: {
      status: "paid",
      currency: "PKR",
      subtotal: 49900,
      discount_total: 0,
      first_order_item: { variant_id: "1928885", quantity: 1 },
    },
  },
})

const sign = (raw: string) => createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex")

beforeEach(() => {
  vi.clearAllMocks()
  from.mockImplementation(() => updateChain())
})

describe("career add-on webhook replay", () => {
  it("rejects an unsigned redelivery before it can reach the claim", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = body("order_created", "order-77")

    const result = await handleCareerAddonWebhook(raw, null, "order_created")

    expect(result.status).toBe(401)
    expect(result.body).toMatchObject({ error: "payment_signature_invalid" })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("rejects a body whose signature does not match the payload", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = body("order_created", "order-77")

    const result = await handleCareerAddonWebhook(raw, sign(raw + "tampered"), "order_created")

    expect(result.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("treats an already-completed event as a duplicate and grants nothing", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = body("order_created", "order-77")
    rpc.mockResolvedValue({ data: "completed", error: null })

    const result = await handleCareerAddonWebhook(raw, sign(raw), "order_created")

    expect(result.status).toBe(200)
    expect(result.body).toEqual({ ok: true, duplicate: true })
    // A duplicate must not look up the order, fulfil it, or notify anyone.
    expect(supabaseSelect).not.toHaveBeenCalled()
    expect(createNotification).not.toHaveBeenCalled()
    // Only the claim itself may hit the database.
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith("claim_payment_webhook_v2", {
      p_provider: "lemonsqueezy_career_addon",
      p_event_id: "order_created:order-77",
    })
  })

  it("asks the provider to retry rather than double-granting a concurrent delivery", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = body("order_created", "order-77")
    rpc.mockResolvedValue({ data: "busy", error: null })

    const result = await handleCareerAddonWebhook(raw, sign(raw), "order_created")

    expect(result.status).toBe(503)
    expect(supabaseSelect).not.toHaveBeenCalled()
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("does not process the event when the claim itself fails", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = body("order_created", "order-77")
    rpc.mockResolvedValue({ data: null, error: { message: "connection lost" } })

    const result = await handleCareerAddonWebhook(raw, sign(raw), "order_created")

    expect(result.status).toBe(503)
    expect(supabaseSelect).not.toHaveBeenCalled()
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("keys the claim on the event name so a refund is not swallowed as a duplicate order", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = JSON.stringify({
      meta: { event_name: "order_refunded", custom_data: { token: "addon-token" } },
      data: { id: "order-77", attributes: { status: "refunded", refunded: true, first_order_item: { variant_id: "1928885", quantity: 1 } } },
    })
    rpc.mockResolvedValue({ data: "completed", error: null })

    await handleCareerAddonWebhook(raw, sign(raw), "order_refunded")

    expect(rpc).toHaveBeenCalledWith("claim_payment_webhook_v2", {
      p_provider: "lemonsqueezy_career_addon",
      p_event_id: "order_refunded:order-77",
    })
  })

  it("refuses an event whose name does not match the signed payload", async () => {
    const { handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments")
    const raw = body("order_created", "order-77")

    // A caller routing on one name while the signed body says another must not
    // be able to steer the handler into a different code path.
    const result = await handleCareerAddonWebhook(raw, sign(raw), "order_refunded")

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ error: "event_name_mismatch" })
    expect(rpc).not.toHaveBeenCalled()
  })
})
