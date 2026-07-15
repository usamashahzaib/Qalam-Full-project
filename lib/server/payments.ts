import "server-only"

import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { supabaseInsert, supabaseSelect, supabaseUpsert, createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { log } from "@/lib/server/logging"
import { plans as PRICING_PLANS } from "@/lib/pricing"

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

const asStringRecord = (body: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value == null ? "" : String(value)]))

/**
 * Field-based HMAC verification shared by JazzCash and Easypaisa.
 * Collects the relevant fields (excluding the signature itself), sorts them
 * alphabetically by key, concatenates the non-empty values with "&", and
 * compares HMAC-SHA256(secret, message) against the provided signature.
 * `saltPrefix` prepends the integrity salt to the message (JazzCash style).
 */
const verifySortedFieldHmac = (
  body: Record<string, string>,
  secret: string,
  opts: { include: (key: string) => boolean; signatureKeys: string[]; saltPrefix: boolean }
): boolean => {
  if (!secret) throw new Error("payment_secret_not_configured")
  const entries = Object.entries(body)
  const provided = (entries.find(([key]) => opts.signatureKeys.includes(key.toLowerCase()))?.[1] || "").toLowerCase()
  if (!provided) return false

  const sortedKeys = entries
    .filter(([key]) => opts.include(key) && !opts.signatureKeys.includes(key.toLowerCase()))
    .map(([key]) => key)
    .sort((a, b) => a.localeCompare(b))
  const concatenated = sortedKeys
    .map((key) => String(body[key] ?? ""))
    .filter((value) => value !== "")
    .join("&")

  const salted = `${secret}&${concatenated}`
  // Accept both the salt-prefixed and values-only variants - JazzCash deployments differ.
  if (opts.saltPrefix && timingSafeEqual(hmacHex(secret, salted), provided)) return true
  return timingSafeEqual(hmacHex(secret, concatenated), provided)
}

// JazzCash signature scheme: HMAC-SHA256 of sorted pp_* field values. Verify this matches your JazzCash dashboard settings.
export const verifyJazzCashHmac = (body: Record<string, string>, secret: string): boolean =>
  verifySortedFieldHmac(body, secret, {
    include: (key) => key.toLowerCase().startsWith("pp_"),
    signatureKeys: ["pp_securehash"],
    saltPrefix: true,
  })

// Easypaisa signature scheme: HMAC-SHA256 of sorted signed field values (storeId, orderId,
// transactionAmount, mobileAccountNo, ...). Verify this matches your Easypaisa merchant settings.
export const verifyEasypaisaHmac = (body: Record<string, string>, secret: string): boolean =>
  verifySortedFieldHmac(body, secret, {
    include: (key) => !["signature", "securehash", "hmac", "merchanthashedreq", "hashrequest"].includes(key.toLowerCase()),
    signatureKeys: ["signature", "securehash", "hmac", "merchanthashedreq", "hashrequest"],
    saltPrefix: false,
  })

// Replay protection: reject webhook payloads whose timestamp is outside a generous window.
// JazzCash uses pp_TxnDateTime, Easypaisa transactionDateTime, both as yyyyMMddHHmmss.
// The window is wide (24h) to tolerate gateway/timezone skew; the unique
// (provider, transaction_id) upsert is the primary defence against double-activation.
const REPLAY_WINDOW_SECONDS = 24 * 60 * 60

const extractTimestampMs = (body: Record<string, unknown>): number | null => {
  const raw = textValue(body.pp_TxnDateTime, body.transactionDateTime, body.txnDateTime, body.orderDateTime)
  if (/^\d{14}$/.test(raw)) {
    const ms = Date.UTC(
      Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)),
      Number(raw.slice(8, 10)), Number(raw.slice(10, 12)), Number(raw.slice(12, 14))
    )
    return Number.isFinite(ms) ? ms : null
  }
  const epoch = Number(textValue(body.timestamp, body.pp_Timestamp))
  if (Number.isFinite(epoch) && epoch > 0) return epoch < 1e12 ? epoch * 1000 : epoch
  return null
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
  // JazzCash/Easypaisa post form-encoded callbacks; Stripe and JSON APIs post JSON.
  const contentType = (request.headers.get("content-type") || "").toLowerCase()
  const isForm = contentType.includes("application/x-www-form-urlencoded")
  const body: Record<string, unknown> = isForm
    ? Object.fromEntries(new URLSearchParams(rawBody))
    : (JSON.parse(rawBody || "{}") as Record<string, unknown>)

  const headerSignature = request.headers.get("x-payment-signature") || request.headers.get("x-signature")
  const hasPpFields = Object.keys(body).some((key) => key.toLowerCase().startsWith("pp_"))
  const provider: PaymentProvider = request.headers.get("stripe-signature")
    ? "stripe"
    : hasPpFields
      ? "jazzcash"
      : normalizeProvider(request.headers.get("x-payment-provider"), body)

  const verified =
    provider === "stripe"
      ? verifyStripe(rawBody, request.headers.get("stripe-signature"))
      : provider === "jazzcash"
        ? verifyJazzCashHmac(asStringRecord(body), env.jazzCashWebhookSecret)
        : isForm || !headerSignature
          ? verifyEasypaisaHmac(asStringRecord(body), env.easyPaisaWebhookSecret)
          : verifyGenericHmac(rawBody, headerSignature, env.easyPaisaWebhookSecret)

  if (!verified) throw new Error("payment_signature_invalid")

  // Replay protection for the field-based gateways (Stripe enforces its own timestamp window).
  if (provider !== "stripe") {
    const ts = extractTimestampMs(body)
    if (ts !== null && Math.abs(Date.now() - ts) / 1000 > REPLAY_WINDOW_SECONDS) {
      throw new Error("payment_replay_expired")
    }
  }

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

  const amount = numberValue(stripe.amount_total, stripe.amount_received, body.amount, body.pp_Amount)

  // JazzCash/Easypaisa only sign their own gateway-specific fields (pp_* / non-signature
  // fields respectively) - plan_name/user_id/email are plain body fields an attacker can
  // freely add or rewrite on top of a genuine, validly-signed low-value transaction without
  // invalidating the signature. The transaction amount IS part of the signed field set for
  // both gateways, so cross-check the claimed plan's price against it to stop a cheap real
  // payment from being replayed as an activation request for a more expensive plan.
  if (provider !== "stripe") {
    const plan = PRICING_PLANS.find((p) => p.name === planName)
    const candidatePrices = [plan?.monthlyPrice, plan?.annualPrice].filter(
      (p): p is number => typeof p === "number" && p > 0
    )
    // Gateways vary on whether amount is sent as major units (499) or minor units (49900) -
    // accept either representation of a known plan price.
    const matchesKnownPrice = candidatePrices.some(
      (price) => Math.abs(amount - price) <= 1 || Math.abs(amount - price * 100) <= 100
    )
    if (!matchesKnownPrice) throw new Error("payment_amount_plan_mismatch")
  }

  const extracted = {
    provider,
    status,
    userId: textValue(metadata.user_id, metadata.userId, body.user_id, body.userId, stripe.client_reference_id),
    userEmail: textValue(metadata.email, body.email, body.user_email, stripe.customer_email),
    amount,
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
// Returns null for personal-workspace users who have no linked org - that is fine;
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
        customer_id: payment.transactionId,
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

  // Fire-and-forget confirmation email - never block the payment response on this
  sendTransactionalEmail({
    to: user.email,
    subject: `Qalam ${payment.planName} activated`,
    text: `Your ${payment.planName} plan is active until ${expiresAt ? new Date(expiresAt).toDateString() : "your billing renewal"}.`,
  }).catch(() => undefined)

  return { updated: true, user, organizationId, expiresAt }
}