import { describe, expect, it } from "vitest"
import { isStalePaymentRevocation } from "@/lib/payment-lifecycle"

describe("payment lifecycle revocation guard", () => {
  it("accepts an expiry for the currently active subscription", () => {
    expect(isStalePaymentRevocation("sub-current", "sub-current", "event-expired")).toBe(false)
  })

  it("rejects an expiry for a superseded subscription", () => {
    expect(isStalePaymentRevocation("sub-pro", "sub-solo", "event-expired")).toBe(true)
  })

  it("rejects a refund for a superseded one-off order", () => {
    expect(isStalePaymentRevocation("order-new", null, "order-old")).toBe(true)
  })

  it("preserves legacy behavior when no active customer handle exists", () => {
    expect(isStalePaymentRevocation(null, "sub-old", "event-expired")).toBe(false)
  })
})
