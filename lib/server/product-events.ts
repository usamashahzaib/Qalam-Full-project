import "server-only"

import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"
import type { PaymentProvider, PaymentStatus } from "@/lib/server/payments"
import type { PlanName } from "@/lib/pricing"

type BillingCycle = "monthly" | "quarterly" | "annual"
type PaidProductPlanName = Exclude<PlanName, "Free">

export type WorkflowProductEvent = {
  eventName: "writer_draft_generated"
  userId: string
  workspaceId: string
  idempotencyKey: string
  occurredAt?: string
  contentType: "linkedin_post"
}

export type PaymentProductEvent = {
  eventName:
    | "checkout_paid"
    | "entitlement_activated"
    | "subscription_renewed"
    | "payment_failed"
    | "payment_refunded"
    | "subscription_cancelled"
    | "subscription_expired"
  userId: string
  workspaceId?: string | null
  idempotencyKey: string
  occurredAt?: string
  planName: PaidProductPlanName
  billingCycle: BillingCycle
  provider: PaymentProvider
  transactionId: string
  paymentStatus: PaymentStatus
}

export type ProductEvent = WorkflowProductEvent | PaymentProductEvent

type RpcResult = { event_id: string; inserted: boolean }

async function primaryWorkspaceId(userId: string): Promise<string | null> {
  const rows = await supabaseSelect<{ workspace_id: string }>(
    "workspace_members",
    `user_id=eq.${encodeURIComponent(userId)}&select=workspace_id&order=created_at.asc&limit=1`,
  )
  return rows[0]?.workspace_id ?? null
}

export async function recordProductEvent(event: ProductEvent): Promise<RpcResult> {
  const workspaceId = "workspaceId" in event && event.workspaceId !== undefined
    ? event.workspaceId
    : await primaryWorkspaceId(event.userId)

  const payment = event.eventName === "writer_draft_generated" ? null : event
  const { data, error } = await createServiceClient().rpc("record_product_event_v1", {
    p_user_id: event.userId,
    p_workspace_id: workspaceId,
    p_event_name: event.eventName,
    p_idempotency_key: event.idempotencyKey,
    p_source: "server",
    p_content_type: event.eventName === "writer_draft_generated" ? event.contentType : null,
    p_plan_name: payment?.planName ?? null,
    p_billing_cycle: payment?.billingCycle ?? null,
    p_payment_provider: payment?.provider ?? null,
    p_payment_transaction_id: payment?.transactionId ?? null,
    p_payment_status: payment?.paymentStatus ?? null,
    p_occurred_at: event.occurredAt ?? new Date().toISOString(),
  })

  if (error) throw new Error(`record_product_event_failed: ${error.message}`)
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.event_id) throw new Error("record_product_event_empty")
  return row as RpcResult
}

/** Measurement failure is observable but never reverses completed user value. */
export async function recordProductEventSafely(event: ProductEvent): Promise<boolean> {
  try {
    await recordProductEvent(event)
    return true
  } catch (error) {
    log.error("product_event.record_failed", {
      eventName: event.eventName,
      userId: event.userId,
      error: (error as Error).message,
    })
    return false
  }
}
