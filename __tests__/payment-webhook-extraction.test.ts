import crypto from "node:crypto"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/env", () => ({
  env: {
    lemonSqueezyWebhookSecret: "webhook-secret",
    stripeWebhookSecret: "",
    jazzCashWebhookSecret: "",
    easyPaisaWebhookSecret: "",
  },
}))

vi.mock("@/lib/server/checkout-token", () => ({
  verifyCheckoutToken: (token: string) => token === "trusted-token" ? "user-1" : null,
}))

let verifyAndExtractPayment: typeof import("@/lib/server/payments").verifyAndExtractPayment

beforeAll(async () => {
  ;({ verifyAndExtractPayment } = await import("@/lib/server/payments"))
})

const signedRequest = (body: Record<string, unknown>, eventName: string) => {
  const rawBody = JSON.stringify(body)
  const signature = crypto
    .createHmac("sha256", "webhook-secret")
    .update(rawBody)
    .digest("hex")
  const request = new Request("https://app.byqalam.com/api/payments/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-event-name": eventName,
      "x-signature": signature,
    },
    body: rawBody,
  })
  return { request, rawBody }
}

const payload = (
  eventName: string,
  id: string,
  attributes: Record<string, unknown>
) => ({
  meta: {
    event_name: eventName,
    custom_data: { token: "trusted-token", email: "private@example.com" },
  },
  data: { type: "orders", id, attributes },
})

const extract = (
  eventName: string,
  id: string,
  attributes: Record<string, unknown>
) => {
  const { request, rawBody } = signedRequest(payload(eventName, id, attributes), eventName)
  return verifyAndExtractPayment(request, rawBody)
}

describe("Lemon Squeezy webhook extraction", () => {
  it("separates delivery idempotency from the financial ledger key", () => {
    const order = extract("order_created", "order-1", {
      status: "paid",
      total: 49900,
      currency: "PKR",
      first_order_item: { variant_id: 1928885 },
    })
    const refund = extract("order_refunded", "order-1", {
      status: "refunded",
      refunded: true,
      total: 49900,
      currency: "PKR",
      first_order_item: { variant_id: 1928885 },
    })

    expect(refund.transactionId).toBe(order.transactionId)
    expect(refund.eventId).not.toBe(order.eventId)
    expect(refund.status).toBe("refunded")
    expect(refund.revokeAccess).toBe(true)
  })

  it("records a partial refund without revoking access", () => {
    const refund = extract("order_refunded", "order-1", {
      status: "paid",
      refunded: false,
      refunded_amount: 10000,
      total: 49900,
      currency: "PKR",
      first_order_item: { variant_id: 1928885 },
    })

    expect(refund.status).toBe("partially_refunded")
    expect(refund.revokeAccess).toBe(false)
    expect(refund.recordTransaction).toBe(true)
  })

  it("handles a fully refunded renewal invoice", () => {
    const refund = extract("subscription_payment_refunded", "invoice-1", {
      status: "refunded",
      refunded: true,
      subscription_id: 456,
      order_id: 123,
      total: 49900,
      currency: "PKR",
    })

    expect(refund.transactionId).toBe("invoice-1")
    expect(refund.subscriptionId).toBe("456")
    expect(refund.status).toBe("refunded")
    expect(refund.revokeAccess).toBe(true)
  })

  it("activates on subscription lifecycle and does not create a fake payment", () => {
    const subscription = extract("subscription_created", "sub-1", {
      status: "active",
      order_id: 123,
      variant_id: 1928922,
      renews_at: "2026-08-24T00:00:00.000Z",
    })

    expect(subscription.subscriptionId).toBe("sub-1")
    expect(subscription.orderId).toBe("123")
    expect(subscription.activateAccess).toBe(true)
    expect(subscription.recordTransaction).toBe(false)
    expect(subscription.creditReferral).toBe(false)
  })

  it("records the initial order and credits referral without racing activation", () => {
    const order = extract("order_created", "order-1", {
      status: "paid",
      total: 49900,
      currency: "PKR",
      first_order_item: { variant_id: 1928885 },
    })

    expect(order.activateAccess).toBe(false)
    expect(order.recordTransaction).toBe(true)
    expect(order.creditReferral).toBe(true)
  })

  it("uses a stable event id for retries and a new id for changed content", () => {
    const attrs = {
      status: "active",
      order_id: 123,
      variant_id: 1928922,
      renews_at: "2026-08-24T00:00:00.000Z",
    }
    const first = extract("subscription_updated", "sub-1", attrs)
    const retry = extract("subscription_updated", "sub-1", attrs)
    const changed = extract("subscription_updated", "sub-1", {
      ...attrs,
      renews_at: "2026-09-24T00:00:00.000Z",
    })

    expect(retry.eventId).toBe(first.eventId)
    expect(changed.eventId).not.toBe(first.eventId)
  })

  it("stores only a redacted operational payload", () => {
    const order = extract("order_created", "order-1", {
      status: "paid",
      total: 49900,
      currency: "PKR",
      user_email: "private@example.com",
      first_order_item: { variant_id: 1928885 },
    })
    const raw = order.rawPayload as Record<string, unknown>

    expect(raw.resource_id).toBe("order-1")
    expect(JSON.stringify(raw)).not.toContain("private@example.com")
    expect(JSON.stringify(raw)).not.toContain("trusted-token")
  })
})
