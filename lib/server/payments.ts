import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { supabaseInsert, supabaseSelect, supabaseUpsert, createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { log } from "@/lib/server/logging"

export type PaymentProvider = "stripe" | "jazzcash" | "easypaisa"
export type PaymentStatus = "paid" | "failed" | "cancelled"

export type VerifiedPayment = {
  provider: PaymentProvider
  status: PaymentStatus
  userId: string
  userEmail?: string
  amount: number
  currency: string
  planName: "Free" | "Solo" | "Pro" | "Agency"
  transactionId: string
  billingCycle: "monthly" | "annual"
  rawPayload: unknown
}

type UserRow = { id: string; email: string }
type WorkspaceRow = { id: string; organization_id: string | null }

const PLAN_NAMES = new Set(["Free", "Solo", "Pro", "Agency"])

const timingSafeEqual = (a: string, b: string) => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

const hmacHex = (secret: string, payload: string) =>
  crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex")

const normalizeProvider = (value: string | null | undefined, body: Record<string, unknown>): PaymentProvider => {
  const raw = String(value || body.provider || body.payment_provider || "").trim().toLowerCase()
  if (raw.includes("stripe")) return "stripe"
  if (raw.includes("jazz")) return "jazzcash"
  if (raw.includes("easy") || raw.includes("easypaisa")) return "easypaisa"
  throw new Error("unsupported_payment_provider")
}

const verifyStripe = (rawBody: string, signature: string | null) => {
  if (!env.stripeWebhookSecret || !signature) return false
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...value] = part.split("=")
    return [key, value.join("=")]
  }))
  const timestamp = parts.t
  const given = parts.v1
  if (!timestamp || !given) return false
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false
  return timingSafeEqual(hmacHex(env.stripeWebhookSecret, `${timestamp}.${rawBody}`), given)
}

const verifyGenericHmac = (rawBody: string, signature: string | null, secret: string): boolean => {
  if (!secret) throw new Error("payment_secret_not_configured")
  if (!signature) return false
  return timingSafeEqual(hmacHex(secret, rawBody), signature.replace(/^sha256=/i, ""))
}

const textValue = (...values: unknown[]) =>
  values.map((value) => String(value || "").trim()).find(Boolean) || ""

const numberValue = (...values: unknown[]) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "")
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const objectValue = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : {}

const stripeObject = (body: Record<string, unknown>) =>
  objectValue(objectValue(body.data).object)

const stripeStatus = (type: string): PaymentStatus => {
  if (type.includes("failed")) return "failed"
  if (type.includes("cancel")) return "cancelled"
  return "paid"
}

export const verifyAndExtractPayment = (request: Request, rawBody: string): VerifiedPayment => {
  const body = JSON.parse(rawBody || "{}") as Record<string, unknown>
  const provider = request.headers.get("stripe-signature") ? "stripe" : normalizeProvider(request.headers.get("x-payment-provider"), body)
  const signature = request.headers.get("stripe-signature") || request.headers.get("x-payment-signature") || request.headers.get("x-signature")

  const verified =
    provider === "stripe"
      ? verifyStripe(rawBody, request.headers.get("stripe-signature"))
      : provider === "jazzcash"
        ? verifyGenericHmac(rawBody, signature, env.jazzCashWebhookSecret)
        : verifyGenericHmac(rawBody, signature, env.easyPaisaWebhookSecret)

  if (!verified) throw new Error("payment_signature_invalid")

  const stripe = provider === "stripe" ? stripeObject(body) : {}
  const metadata = objectValue(stripe.metadata || body.metadata)
  const type = String(body.type || body.event || body.status || "").toLowerCase()
  const status = provider === "stripe" ? stripeStatus(type) : String(body.status || body.payment_status || "").toLowerCase().includes("fail")
    ? "failed"
    : String(body.status || body.payment_status || "").toLowerCase().includes("cancel")
      ? "cancelled"
      : "paid"
  const planName = textValue(metadata.plan_name, metadata.plan, body.plan_name, body.plan, stripe.plan_name) as VerifiedPayment["planName"]
  const billingCycle: VerifiedPayment["billingCycle"] = textValue(metadata.billing_cycle, body.billing_cycle, body.interval).toLowerCase().includes("annual") ? "annual" : "monthly"
  if (!PLAN_NAMES.has(planName)) throw new Error("invalid_plan_name")

  const extracted = {
    provider,
    status,
    userId: textValue(metadata.user_id, metadata.userId, body.user_id, body.userId, stripe.client_reference_id),
    userEmail: textValue(metadata.email, body.email, body.user_email, stripe.customer_email),
    amount: numberValue(stripe.amount_total, stripe.amount_received, body.amount, body.pp_Amount),
    currency: textValue(stripe.currency, body.currency, body.pp_Currency) || "PKR",
    planName,
    transactionId: textValue(stripe.payment_intent, stripe.id, body.transaction_id, body.transactionId, body.pp_TxnRefNo, body.id),
    billingCycle,
    rawPayload: body,
  }
  if (!extracted.transactionId) throw new Error("missing_transaction_id")
  if (!extracted.userId && !extracted.userEmail) throw new Error("missing_payment_user")
  return extracted
}

const addBillingDays = (days: number) => {
  const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  expiry.setUTCHours(23, 59, 59, 999)
  return expiry.toISOString()
}

const getUser = async (payment: VerifiedPayment) => {
  const byId = payment.userId
    ? await supabaseSelect<UserRow>("users", `id=eq.${encodeURIComponent(payment.userId)}&select=id,email&limit=1`).catch(() => [])
    : []
  if (byId[0]) return byId[0]
  if (!payment.userEmail) return null
  const byEmail = await supabaseSelect<UserRow>("users", `email=eq.${encodeURIComponent(payment.userEmail.trim().toLowerCase())}&select=id,email&limit=1`).catch(() => [])
  return byEmail[0] || null
}

// Resolve org via the user's primary workspace (workspace_members -> workspaces -> organization_id).
// Returns null for personal-workspace users who have no linked org — that is fine;
// activate_plan handles a null org_id gracefully.
const getOrganizationId = async (userId: string): Promise<string | null> => {
  try {
    const rows = await supabaseSelect<{ workspace_id: string }>(
      "workspace_members",
      `user_id=eq.${encodeURIComponent(userId)}&select=workspace_id&limit=1`
    )
    const workspaceId = rows?.[0]?.workspace_id
    if (!workspaceId) return null

    const wsRows = await supabaseSelect<WorkspaceRow>(
      "workspaces",
      `id=eq.${encodeURIComponent(workspaceId)}&select=id,organization_id&limit=1`
    )
    return wsRows?.[0]?.organization_id ?? null
  } catch {
    return null
  }
}

export const recordPaymentWebhook = async (payment: VerifiedPayment) => {
  const user = await getUser(payment)
  if (!user) throw new Error("payment_user_not_found")

  const organizationId = await getOrganizationId(user.id)
  const now = new Date().toISOString()
  const expiresAt = payment.status === "paid" ? addBillingDays(payment.billingCycle === "annual" ? 365 : 30) : null

  await supabaseUpsert("payments", {
    provider: payment.provider,
    transaction_id: payment.transactionId,
    user_id: user.id,
    organization_id: organizationId,
    amount: payment.amount,
    currency: payment.currency.toUpperCase(),
    plan_name: payment.planName,
    billing_cycle: payment.billingCycle,
    status: payment.status,
    raw_payload: payment.rawPayload,
    processed_at: new Date().toISOString(),
  }, "provider,transaction_id")

  if (payment.status !== "paid") {
    log.info("payments.not_paid", { status: payment.status, provider: payment.provider })
    await sendTransactionalEmail({
      to: user.email,
      subject: "Qalam payment failed",
      text: `Your payment for ${payment.planName} did not complete. Your plan was not changed.`,
    }).catch(() => undefined)
    return { updated: false, user, organizationId }
  }

  const supabase = createServiceClient()

  // Atomic plan activation via RPC (migration 0031). Falls back to direct table updates
  // if the RPC has not been deployed yet so payments always succeed.
  const { error: rpcError } = await supabase.rpc("activate_plan", {
    p_user_id: user.id,
    p_organization_id: organizationId,
    p_plan_name: payment.planName,
    p_expires_at: expiresAt,
    p_customer_id: payment.transactionId,
  })

  if (rpcError) {
    log.warn("payments.activate_plan_rpc_unavailable", { error: rpcError.message })
    const { error: userErr } = await supabase
      .from("users")
      .update({
        plan: payment.planName,
        plan_expires_at: expiresAt,
        plan_started_at: now,
        billing_cycle: payment.billingCycle,
        reminder_sent_3d: false,
        reminder_sent_1d: false,
        updated_at: now,
      })
      .eq("id", user.id)
    if (userErr) {
      log.error("payments.fallback_users_update_failed", { error: userErr.message })
      throw new Error(`activate_plan_failed: ${userErr.message}`)
    }

    if (organizationId) {
      await supabase
        .from("organizations")
        .update({ plan: payment.planName, subscription_status: "active", plan_expires_at: expiresAt, updated_at: now })
        .eq("id", organizationId)
        .then(undefined, (err: unknown) => log.error("payments.org_plan_update_failed", { error: (err as Error).message }))
    }

    await supabase
      .from("plan_usage")
      .upsert({ user_id: user.id, plan: payment.planName.toLowerCase(), cycle_start: now, cycle_end: expiresAt, updated_at: now }, { onConflict: "user_id" })
      .then(undefined, (err: unknown) => log.error("payments.plan_usage_upsert_failed", { error: (err as Error).message }))
  }

  // Fire-and-forget confirmation email — never block the payment response on this
  sendTransactionalEmail({
    to: user.email,
    subject: `Qalam ${payment.planName} activated`,
    text: `Your ${payment.planName} plan is active until ${expiresAt ? new Date(expiresAt).toDateString() : "your billing renewal"}.`,
  }).catch(() => undefined)

  return { updated: true, user, organizationId, expiresAt }
}
