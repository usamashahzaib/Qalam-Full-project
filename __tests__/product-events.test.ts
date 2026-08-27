import { beforeEach, describe, expect, it, vi } from "vitest"

const { rpc, supabaseSelect, logError } = vi.hoisted(() => ({
  rpc: vi.fn(),
  supabaseSelect: vi.fn(),
  logError: vi.fn(),
}))

vi.mock("@/lib/server/supabase-rest", () => ({
  createServiceClient: () => ({ rpc }),
  supabaseSelect,
}))
vi.mock("@/lib/server/logging", () => ({
  log: { error: logError, warn: vi.fn(), info: vi.fn() },
}))

import {
  recordProductEvent,
  recordProductEventSafely,
} from "@/lib/server/product-events"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222"

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue({
    data: [{ event_id: "33333333-3333-4333-8333-333333333333", inserted: true }],
    error: null,
  })
})

describe("server-owned product events", () => {
  it("records activation with a strict payload and caller idempotency key", async () => {
    const occurredAt = "2026-08-25T12:00:00.000Z"

    await expect(recordProductEvent({
      eventName: "writer_draft_generated",
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      occurredAt,
      contentType: "linkedin_post",
    })).resolves.toMatchObject({ inserted: true })

    expect(supabaseSelect).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith("record_product_event_v1", {
      p_user_id: USER_ID,
      p_workspace_id: WORKSPACE_ID,
      p_event_name: "writer_draft_generated",
      p_idempotency_key: "44444444-4444-4444-8444-444444444444",
      p_source: "server",
      p_content_type: "linkedin_post",
      p_plan_name: null,
      p_billing_cycle: null,
      p_payment_provider: null,
      p_payment_transaction_id: null,
      p_payment_status: null,
      p_occurred_at: occurredAt,
    })
  })

  it("resolves the user's first workspace for a payment event", async () => {
    supabaseSelect.mockResolvedValue([{ workspace_id: WORKSPACE_ID }])

    await recordProductEvent({
      eventName: "subscription_renewed",
      userId: USER_ID,
      idempotencyKey: "payment:event-hash",
      occurredAt: "2026-08-25T12:00:00.000Z",
      planName: "Pro",
      billingCycle: "quarterly",
      provider: "lemonsqueezy",
      transactionId: "invoice-42",
      paymentStatus: "paid",
    })

    expect(supabaseSelect).toHaveBeenCalledWith(
      "workspace_members",
      expect.stringContaining(`user_id=eq.${USER_ID}`),
    )
    expect(rpc).toHaveBeenCalledWith("record_product_event_v1", expect.objectContaining({
      p_workspace_id: WORKSPACE_ID,
      p_event_name: "subscription_renewed",
      p_plan_name: "Pro",
      p_billing_cycle: "quarterly",
      p_payment_provider: "lemonsqueezy",
      p_payment_transaction_id: "invoice-42",
      p_payment_status: "paid",
    }))
  })

  it("returns the database duplicate result without inventing a second event", async () => {
    rpc.mockResolvedValue({
      data: [{ event_id: "33333333-3333-4333-8333-333333333333", inserted: false }],
      error: null,
    })

    await expect(recordProductEvent({
      eventName: "writer_draft_generated",
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      contentType: "linkedin_post",
    })).resolves.toEqual({
      event_id: "33333333-3333-4333-8333-333333333333",
      inserted: false,
    })
  })

  it("reports measurement failure without breaking completed user value", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } })

    await expect(recordProductEventSafely({
      eventName: "writer_draft_generated",
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      contentType: "linkedin_post",
    })).resolves.toBe(false)

    expect(logError).toHaveBeenCalledWith("product_event.record_failed", expect.objectContaining({
      eventName: "writer_draft_generated",
      userId: USER_ID,
      error: "record_product_event_failed: database unavailable",
    }))
  })
})
