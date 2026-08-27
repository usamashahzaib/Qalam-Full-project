import { NextRequest, NextResponse } from "next/server"
import { recordPaymentWebhook, verifyAndExtractPayment } from "@/lib/server/payments"
import { isCareerAddonWebhook, handleCareerAddonWebhook } from "@/lib/server/career-addon-payments"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Career add-on orders are a separate, simpler Lemon Squeezy event class with no
  // plan/subscription concept - route them to their own isolated handler before the
  // plan-billing pipeline below, which would reject an event it cannot resolve to a plan.
  let eventName = ""
  let peekedBody: Record<string, unknown> = {}
  try {
    peekedBody = JSON.parse(rawBody || "{}")
    const meta = (peekedBody.meta ?? {}) as Record<string, unknown>
    eventName = typeof meta.event_name === "string" ? meta.event_name : ""
  } catch {
    // Malformed JSON falls through to the main verifier.
  }
  if (eventName) {
    if (isCareerAddonWebhook(eventName, peekedBody)) {
      const result = await handleCareerAddonWebhook(rawBody, request.headers.get("x-signature"), eventName)
      return NextResponse.json(result.body, { status: result.status })
    }
  }

  try {
    const payment = verifyAndExtractPayment(request, rawBody)
    const result = await recordPaymentWebhook(payment)
    return NextResponse.json({
      ok: true,
      provider: payment.provider,
      status: payment.status,
      transactionId: payment.transactionId,
      updated: result.updated,
      // An unattributed payment is recorded, not retried - the row is the reconciliation
      // handle, and further redeliveries would never find a user either.
      ...("orphaned" in result && result.orphaned ? { orphaned: true } : {}),
      ...("revoked" in result && result.revoked ? { revoked: true } : {}),
      ...("cancelled" in result && result.cancelled ? { cancelled: true } : {}),
    })
  } catch (error) {
    const message = (error as Error).message || "payment_webhook_failed"
    if (message === "lemonsqueezy_event_ignored") {
      return NextResponse.json({ ok: true, ignored: true })
    }
    console.error("payment_webhook_failed", { message })
    const status = message === "payment_signature_invalid"
      ? 401
      : message === "payment_webhook_busy" || message.startsWith("payment_webhook_claim_failed")
        ? 503
        : message === "unsupported_payment_provider" || message === "payment_provider_not_enabled"
          ? 400
          : 422
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
