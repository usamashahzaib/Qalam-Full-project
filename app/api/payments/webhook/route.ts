import { NextRequest, NextResponse } from "next/server"
import { recordPaymentWebhook, verifyAndExtractPayment } from "@/lib/server/payments"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  try {
    const payment = verifyAndExtractPayment(request, rawBody)
    const result = await recordPaymentWebhook(payment)
    return NextResponse.json({
      ok: true,
      provider: payment.provider,
      status: payment.status,
      transactionId: payment.transactionId,
      updated: result.updated,
    })
  } catch (error) {
    const message = (error as Error).message || "payment_webhook_failed"
    console.error("payment_webhook_failed", { message })
    const status = message === "payment_signature_invalid" ? 401 : message === "unsupported_payment_provider" ? 400 : 422
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
