import "server-only"

import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { supabaseSelect, supabaseUpsert, createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { cancelLemonSqueezySubscription } from "@/lib/server/lemonsqueezy-api"
import { verifyCheckoutToken } from "@/lib/server/checkout-token"
import { log } from "@/lib/server/logging"
import { plans as PRICING_PLANS, type PlanName } from "@/lib/pricing"
import { LEMONSQUEEZY_VARIANT_PLANS } from "@/lib/server/lemon-variant-plans"
import {
  creditReferralCommissionFromPayment,
  reverseReferralCommissionFromRefund,
} from "@/lib/server/referrals"
import { isStalePaymentRevocation } from "@/lib/payment-lifecycle"
import { resolveCheckoutSession } from "@/lib/server/checkout-session"

export type PaymentProvider = "stripe" | "jazzcash" | "easypaisa" | "lemonsqueezy"
export type PaymentStatus = "paid" | "failed" | "cancelled" | "partially_refunded" | "refunded"

export type VerifiedPayment = {
  provider: PaymentProvider
  status: PaymentStatus
  eventId: string
  eventName: string
  userId: string
  userEmail?: string
  amount: number
  currency: string
  /**
   * Null only for provider events that carry no signed plan identifier (Lemon Squeezy
   * renewal invoices). Those are resolved server-side from `payment_subscriptions`,
   * never from buyer-supplied custom_data. See resolvePlan().
   */
  planName: PlanName | null
  transactionId: string
  /** Stable provider subscription handle. Absent for one-off orders. */
  subscriptionId: string | null
  /** Provider order handle used to link order/refund events to a subscription. */
  orderId: string | null
  billingCycle: "monthly" | "quarterly" | "annual"
  /** Only financial events belong in the payments ledger. */
  recordTransaction: boolean
  /** Lifecycle events activate access. Initial order events only record money. */
  activateAccess: boolean
  /** Only a positive, settled charge can credit a referral. */
  creditReferral: boolean
  /** True for terminal events that must drop the account back to Free immediately. */
  revokeAccess: boolean
  /** Provider-authoritative end of the paid period, when the payload supplies one. */
  periodEndsAt: string | null
  checkoutToken: string | null
  rawPayload: unknown
}

type UserRow = { id: string; email: string; customer_id: string | null }
type WorkspaceRow = { id: string; organization_id: string | null }
type SubscriptionRow = {
  subscription_id: string
  order_id: string | null
  plan_name: PlanName
  billing_cycle: "monthly" | "quarterly" | "annual"
  user_id: string | null
}

const PLAN_NAMES = new Set(["Free", "Solo", "Pro", "Agency"])
const isEnabledPaymentProvider = (provider: PaymentProvider): boolean => provider === "lemonsqueezy"
const PAYMENT_STATUS_RANK: Record<PaymentStatus, number> = {
  failed: 0,
  cancelled: 0,
  paid: 1,
  partially_refunded: 2,
  refunded: 3,
}

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
  if (raw.includes("lemon")) return "lemonsqueezy"
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

// Lemon Squeezy signs the entire raw request body (HMAC-SHA256, hex) via X-Signature -
// unlike JazzCash/Easypaisa, nothing in the payload can be tampered with independently.
// Exported for reuse by lib/server/career-addon-payments.ts, which verifies the same
// signature scheme for a separate, non-plan class of Lemon Squeezy order.
export const verifyLemonSqueezy = (rawBody: string, signature: string | null, secret: string): boolean => {
  if (!secret) throw new Error("payment_secret_not_configured")
  if (!signature) return false
  return timingSafeEqual(hmacHex(secret, rawBody), signature)
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
  const lemonSqueezyEventName = request.headers.get("x-event-name")
  const provider: PaymentProvider = request.headers.get("stripe-signature")
    ? "stripe"
    : lemonSqueezyEventName
      ? "lemonsqueezy"
      : hasPpFields
        ? "jazzcash"
        : normalizeProvider(request.headers.get("x-payment-provider"), body)

  const verified =
    provider === "stripe"
      ? verifyStripe(rawBody, request.headers.get("stripe-signature"))
      : provider === "lemonsqueezy"
        ? verifyLemonSqueezy(rawBody, request.headers.get("x-signature"), env.lemonSqueezyWebhookSecret)
        : provider === "jazzcash"
          ? verifyJazzCashHmac(asStringRecord(body), env.jazzCashWebhookSecret)
          : isForm || !headerSignature
            ? verifyEasypaisaHmac(asStringRecord(body), env.easyPaisaWebhookSecret)
            : verifyGenericHmac(rawBody, headerSignature, env.easyPaisaWebhookSecret)

  if (!verified) throw new Error("payment_signature_invalid")

  // Only Lemon Squeezy is wired to a server-owned checkout identity and price map.
  // Keep dormant providers fail-closed until they gain an equivalent order binding.
  if (!isEnabledPaymentProvider(provider)) throw new Error("payment_provider_not_enabled")

  // Replay protection for field-based gateways if they are enabled later.
  if (provider !== "stripe" && provider !== "lemonsqueezy") {
    const ts = extractTimestampMs(body)
    if (ts === null) throw new Error("payment_timestamp_missing")
    if (Math.abs(Date.now() - ts) / 1000 > REPLAY_WINDOW_SECONDS) {
      throw new Error("payment_replay_expired")
    }
  }

  const stripe = provider === "stripe" ? stripeObject(body) : {}
  const lsMeta = provider === "lemonsqueezy" ? objectValue(body.meta) : {}
  const lsData = provider === "lemonsqueezy" ? objectValue(body.data) : {}
  const lsAttrs = objectValue(lsData.attributes)
  const lsCustomData = objectValue(lsMeta.custom_data)

  const metadata = objectValue(stripe.metadata || body.metadata)
  const type = String(body.type || body.event || body.status || "").toLowerCase()
  const lsEventName = String(lsMeta.event_name || "").toLowerCase()
  // billing_reason on a subscription-invoice is "initial" | "renewal" | "updated".
  const lsBillingReason = textValue(lsAttrs.billing_reason).toLowerCase()
  // Terminal/lifecycle intent per Lemon Squeezy event. `revoke` means "drop to Free now";
  // a plain "cancelled" keeps access until the already-granted period end, which is what
  // the customer paid for.
  const lsSubscriptionStatus = textValue(lsAttrs.status).toLowerCase()
  const lsGrossAmount = numberValue(lsAttrs.total, lsAttrs.subtotal)
  const lsRefundedAmount = numberValue(lsAttrs.refunded_amount, lsAttrs.amount_refunded)
  const lsFullyRefunded =
    lsAttrs.refunded === true ||
    lsSubscriptionStatus === "refunded" ||
    (lsGrossAmount > 0 && lsRefundedAmount >= lsGrossAmount)
  const lsEvent = ((): {
    status: PaymentStatus
    revoke: boolean
    recordTransaction: boolean
    activateAccess: boolean
    creditReferral: boolean
  } => {
    if (lsEventName === "order_created") {
      const paid = lsSubscriptionStatus === "paid"
      return {
        status: paid ? "paid" : "failed",
        revoke: false,
        recordTransaction: true,
        activateAccess: false,
        creditReferral: paid,
      }
    }
    if (lsEventName === "order_refunded" || lsEventName === "subscription_payment_refunded") {
      return {
        status: lsFullyRefunded ? "refunded" : "partially_refunded",
        revoke: lsFullyRefunded,
        recordTransaction: true,
        activateAccess: false,
        creditReferral: false,
      }
    }
    if (lsEventName === "subscription_created" || lsEventName === "subscription_resumed") {
      return {
        status: "paid",
        revoke: false,
        recordTransaction: false,
        activateAccess: true,
        creditReferral: false,
      }
    }
    if (lsEventName === "subscription_updated") {
      // subscription_updated also fires as a side effect of cancellation and expiry, where
      // the dedicated events own the state change. Only treat live subscriptions as an
      // activation so a plan swap (upgrade/downgrade) applies immediately.
      if (lsSubscriptionStatus !== "active" && lsSubscriptionStatus !== "on_trial") {
        throw new Error("lemonsqueezy_event_ignored")
      }
      return {
        status: "paid",
        revoke: false,
        recordTransaction: false,
        activateAccess: true,
        creditReferral: false,
      }
    }
    if (lsEventName === "subscription_payment_success") {
      // The initial subscription charge is already covered by order_created (which carries
      // the variant_id). Ignoring it here avoids a duplicate activation + duplicate email.
      if (lsBillingReason === "initial") throw new Error("lemonsqueezy_event_ignored")
      return {
        status: "paid",
        revoke: false,
        recordTransaction: true,
        activateAccess: true,
        creditReferral: false,
      }
    }
    if (lsEventName === "subscription_payment_failed") {
      return {
        status: "failed",
        revoke: false,
        recordTransaction: true,
        activateAccess: false,
        creditReferral: false,
      }
    }
    if (lsEventName === "subscription_cancelled") {
      return {
        status: "cancelled",
        revoke: false,
        recordTransaction: false,
        activateAccess: false,
        creditReferral: false,
      }
    }
    if (lsEventName === "subscription_expired") {
      return {
        status: "cancelled",
        revoke: true,
        recordTransaction: false,
        activateAccess: false,
        creditReferral: false,
      }
    }
    throw new Error("lemonsqueezy_event_ignored")
  })()
  const status: PaymentStatus = provider === "stripe"
    ? stripeStatus(type)
    : provider === "lemonsqueezy"
      ? lsEvent.status
      : String(body.status || body.payment_status || "").toLowerCase().includes("fail")
        ? "failed"
        : String(body.status || body.payment_status || "").toLowerCase().includes("cancel")
          ? "cancelled"
          : "paid"

  const lsVariantId = textValue(lsAttrs.variant_id, objectValue(lsAttrs.first_order_item).variant_id)
  const lsPlan = LEMONSQUEEZY_VARIANT_PLANS[lsVariantId]

  // meta.custom_data is signed by Lemon Squeezy, but its CONTENT comes from the checkout
  // URL the buyer opened - checkout[custom][plan_name] is theirs to edit. It is therefore
  // never a plan source. Events with a variant_id resolve from it; events without one
  // (renewal invoices) are resolved later from payment_subscriptions by subscription_id.
  const planName: PlanName | null =
    provider === "lemonsqueezy"
      ? lsPlan?.planName ?? null
      : ((textValue(metadata.plan_name, metadata.plan, body.plan_name, body.plan, stripe.plan_name) || null) as PlanName | null)
  const billingCycle: VerifiedPayment["billingCycle"] =
    provider === "lemonsqueezy"
      ? lsPlan?.billingCycle || "monthly"
      : textValue(metadata.billing_cycle, body.billing_cycle, body.interval).toLowerCase().includes("annual")
        ? "annual"
        : textValue(metadata.billing_cycle, body.billing_cycle, body.interval).toLowerCase().includes("quarter")
          ? "quarterly"
          : "monthly"

  // Subscription lifecycle events put the subscription on data.id; invoice events carry it
  // as an attribute. One-off orders have neither.
  const lsIsLifecycleEvent = lsEventName.startsWith("subscription_") && !lsEventName.startsWith("subscription_payment_")
  const subscriptionId =
    provider === "lemonsqueezy"
      ? textValue(lsIsLifecycleEvent ? lsData.id : "", lsAttrs.subscription_id) || null
      : textValue(stripe.subscription, body.subscription_id) || null
  const orderId =
    provider === "lemonsqueezy"
      ? textValue(
          lsEventName.startsWith("order_") ? lsData.id : "",
          lsAttrs.order_id
        ) || null
      : null

  // Only Lemon Squeezy defers plan resolution (renewal invoices carry no variant_id);
  // every other provider must name a valid plan up front.
  if (planName && !PLAN_NAMES.has(planName)) throw new Error("invalid_plan_name")
  if (!planName && !(provider === "lemonsqueezy" && (subscriptionId || orderId))) {
    throw new Error("invalid_plan_name")
  }

  const amount = provider === "lemonsqueezy"
    ? numberValue(lsAttrs.total, lsAttrs.subtotal) / 100
    : numberValue(stripe.amount_total, stripe.amount_received, body.amount, body.pp_Amount)

  // JazzCash/Easypaisa only sign their own gateway-specific fields (pp_* / non-signature
  // fields respectively) - plan_name/user_id/email are plain body fields an attacker can
  // freely add or rewrite on top of a genuine, validly-signed low-value transaction without
  // invalidating the signature. The transaction amount IS part of the signed field set for
  // both gateways, so cross-check the claimed plan's price against it to stop a cheap real
  // payment from being replayed as an activation request for a more expensive plan.
  // Stripe and Lemon Squeezy sign the entire payload (and Lemon Squeezy bills in USD, not
  // PKR), so this PKR-price cross-check doesn't apply to either.
  if (provider !== "stripe" && provider !== "lemonsqueezy") {
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

  const lsResourceId = textValue(lsData.id)
  // Financial events for the same order/invoice share one ledger key. Webhook
  // delivery idempotency uses eventId separately, so a refund can update the
  // original ledger row without being mistaken for a duplicate.
  const lsTransactionId = lsEvent.recordTransaction
    ? textValue(
        lsEventName === "order_refunded" ? orderId : "",
        lsResourceId
      )
    : `${lsEventName}:${lsResourceId}`
  const eventId = provider === "lemonsqueezy"
    ? `${lsEventName}:${lsResourceId}:${payloadHash(rawBody)}`
    : textValue(body.id, lsTransactionId)

  // checkout[custom][user_id] and checkout[email] are plain buyer-editable query params -
  // Lemon Squeezy's HMAC proves the webhook payload is genuinely theirs, not that this
  // content is truthful. checkout[custom][token] is a short-lived token this app itself
  // signed server-side for the checkout initiator's own authenticated session (see
  // lib/server/checkout-token.ts) - it is the only trustworthy identity signal Lemon
  // Squeezy round-trips back to us, so it is the only one used to attribute a payment.
  const lsVerifiedUserId = provider === "lemonsqueezy" ? verifyCheckoutToken(textValue(lsCustomData.token)) : null

  const currency = textValue(stripe.currency, body.currency, body.pp_Currency, lsAttrs.currency) || "PKR"
  const extracted: VerifiedPayment = {
    provider,
    status,
    eventId,
    eventName: provider === "lemonsqueezy" ? lsEventName : type,
    userId: provider === "lemonsqueezy"
      ? (lsVerifiedUserId || "")
      : textValue(metadata.user_id, metadata.userId, body.user_id, body.userId, stripe.client_reference_id),
    userEmail: textValue(metadata.email, body.email, body.user_email, stripe.customer_email, lsCustomData.email, lsAttrs.user_email),
    amount,
    currency,
    planName,
    transactionId: textValue(stripe.payment_intent, stripe.id, body.transaction_id, body.transactionId, body.pp_TxnRefNo, body.id, lsTransactionId),
    subscriptionId,
    orderId,
    billingCycle,
    recordTransaction: provider === "lemonsqueezy" ? lsEvent.recordTransaction : true,
    activateAccess: provider === "lemonsqueezy" ? lsEvent.activateAccess : status === "paid",
    creditReferral: provider === "lemonsqueezy" ? lsEvent.creditReferral : status === "paid",
    revokeAccess: provider === "lemonsqueezy" ? lsEvent.revoke : false,
    periodEndsAt: provider === "lemonsqueezy" ? textValue(lsAttrs.renews_at, lsAttrs.ends_at) || null : null,
    checkoutToken: provider === "lemonsqueezy" ? textValue(lsCustomData.token) || null : null,
    rawPayload: sanitizePaymentPayload(provider, body, {
      eventName: provider === "lemonsqueezy" ? lsEventName : type,
      resourceId: lsResourceId || textValue(body.id),
      orderId,
      subscriptionId,
      variantId: lsVariantId,
      amount,
      currency,
      status,
    }),
  }
  if (!extracted.eventId) throw new Error("missing_event_id")
  if (!extracted.transactionId) throw new Error("missing_transaction_id")
  // A subscription handle is itself a route back to the account, so it counts as an identifier.
  if (!extracted.userId && !extracted.userEmail && !extracted.subscriptionId && !extracted.orderId && !extracted.checkoutToken) {
    throw new Error("missing_payment_user")
  }
  return extracted
}

const addBillingDays = (days: number) => {
  const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  expiry.setUTCHours(23, 59, 59, 999)
  return expiry.toISOString()
}

/**
 * Errors deliberately propagate: a Supabase outage must surface as a retryable failure,
 * not as "this customer does not exist", which would silently orphan a real payment.
 * A null return means the lookup succeeded and genuinely matched nobody.
 */
const getUser = async (payment: VerifiedPayment, subscription: SubscriptionRow | null) => {
  const checkoutSessionUserId =
    payment.provider === "lemonsqueezy" && payment.checkoutToken
      ? await resolveCheckoutSession(payment.checkoutToken)
      : null
  const candidateId = payment.userId || checkoutSessionUserId || subscription?.user_id || ""
  if (candidateId) {
    const byId = await supabaseSelect<UserRow>("users", `id=eq.${encodeURIComponent(candidateId)}&select=id,email,customer_id&limit=1`)
    if (byId[0]) return byId[0]
  }
  // Lemon Squeezy's checkout[email] is just as buyer-editable as checkout[custom][user_id] -
  // once a subscription is established, subscription.user_id (from the earlier
  // token-verified activation) already covers renewals. For a brand-new subscription with
  // no verified token, falling back to an email match would let an attacker attribute their
  // own payment to any existing account by simply typing that account's email into the
  // checkout form - so there is no safe fallback for Lemon Squeezy here; treat it as
  // unattributed instead of guessing.
  if (payment.provider === "lemonsqueezy") return null
  if (!payment.userEmail) return null
  const byEmail = await supabaseSelect<UserRow>("users", `email=eq.${encodeURIComponent(payment.userEmail.trim().toLowerCase())}&select=id,email,customer_id&limit=1`)
  return byEmail[0] || null
}

/**
 * The plan for a renewal comes from the mapping established by an earlier event that
 * carried a signed variant_id - never from buyer-editable checkout custom_data.
 */
const getSubscription = async (payment: VerifiedPayment): Promise<SubscriptionRow | null> => {
  if (!payment.subscriptionId && !payment.orderId) return null
  const identityFilter = payment.subscriptionId
    ? `subscription_id=eq.${encodeURIComponent(payment.subscriptionId)}`
    : `order_id=eq.${encodeURIComponent(payment.orderId || "")}`
  const rows = await supabaseSelect<SubscriptionRow>(
    "payment_subscriptions",
    `provider=eq.${encodeURIComponent(payment.provider)}&${identityFilter}&select=subscription_id,order_id,plan_name,billing_cycle,user_id&limit=1`
  )
  return rows[0] || null
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

/** Drop an account back to Free immediately. Used for refunds and expired subscriptions. */
const revokePlan = async (userId: string, organizationId: string | null, now: string) => {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("users")
    .update({ plan: "Free", plan_expires_at: null, billing_cycle: "monthly", updated_at: now })
    .eq("id", userId)
  if (error) throw new Error(`revoke_plan_failed: ${error.message}`)

  if (organizationId) {
    await supabase
      .from("organizations")
      .update({ plan: "Free", subscription_status: "canceled", plan_expires_at: null, updated_at: now })
      .eq("id", organizationId)
      .then(undefined, (err: unknown) => log.error("payments.org_revoke_failed", { error: (err as Error).message }))
  }

  await supabase
    .from("plan_usage")
    .upsert({ user_id: userId, plan: "free", updated_at: now }, { onConflict: "user_id" })
    .then(undefined, (err: unknown) => log.error("payments.plan_usage_revoke_failed", { error: (err as Error).message }))
}

const processPaymentWebhook = async (payment: VerifiedPayment) => {
  const subscription = await getSubscription(payment)
  const stableSubscriptionId = payment.subscriptionId || subscription?.subscription_id || null

  // Renewal invoices carry no variant_id, so the stored mapping is the only trusted plan
  // source. If it is missing the subscription_created webhook has probably not landed yet:
  // fail so the provider retries, rather than falling back to buyer-supplied custom_data.
  const planName = payment.planName ?? subscription?.plan_name ?? null
  const billingCycle = payment.planName ? payment.billingCycle : subscription?.billing_cycle ?? payment.billingCycle
  if (!planName) {
    log.error("payments.subscription_plan_unresolved", {
      provider: payment.provider,
      subscriptionId: payment.subscriptionId,
    })
    throw new Error("subscription_plan_unresolved")
  }

  const user = await getUser(payment, subscription)
  const organizationId = user ? await getOrganizationId(user.id) : null
  const now = new Date().toISOString()
  // Prefer the provider's own period end over a locally computed one so our expiry never
  // drifts from theirs across late deliveries and retries.
  const expiresAt = payment.status === "paid"
    ? payment.periodEndsAt || addBillingDays(billingCycle === "annual" ? 365 : billingCycle === "quarterly" ? 90 : 30)
    : null
  const existingPayment = payment.recordTransaction
    ? await supabaseSelect<{ status: PaymentStatus }>(
        "payments",
        `provider=eq.${encodeURIComponent(payment.provider)}&transaction_id=eq.${encodeURIComponent(payment.transactionId)}&select=status&limit=1`
      ).then((rows) => rows[0] || null)
    : null
  const staleFinancialState = existingPayment
    ? PAYMENT_STATUS_RANK[existingPayment.status] > PAYMENT_STATUS_RANK[payment.status]
    : false

  // Only money movement belongs in the ledger. Lifecycle notifications update
  // subscription state without creating fake zero-value payment rows.
  if (payment.recordTransaction && !staleFinancialState) {
    await supabaseUpsert("payments", {
      provider: payment.provider,
      transaction_id: payment.transactionId,
      user_id: user?.id ?? null,
      organization_id: organizationId,
      subscription_id: stableSubscriptionId,
      amount: payment.amount,
      currency: payment.currency.toUpperCase(),
      plan_name: planName,
      billing_cycle: billingCycle,
      status: payment.status,
      raw_payload: payment.rawPayload,
      processed_at: now,
    }, "provider,transaction_id")
  }

  if (!user) {
    log.error("payments.unattributed", {
      provider: payment.provider,
      transactionId: payment.transactionId,
      subscriptionId: payment.subscriptionId,
      userEmail: payment.userEmail || null,
    })
    return { updated: false, user: null, organizationId: null, orphaned: true }
  }

  if (staleFinancialState) {
    log.info("payments.stale_financial_state_ignored", {
      provider: payment.provider,
      transactionId: payment.transactionId,
      existingStatus: existingPayment?.status,
      incomingStatus: payment.status,
    })
    return { updated: false, stale: true, user, organizationId }
  }

  // Keep the subscription -> plan mapping current. planName here is always variant-derived
  // or read back from this same table, so this can never launder custom_data into a plan.
  if (stableSubscriptionId && (payment.subscriptionId || payment.revokeAccess)) {
    await supabaseUpsert("payment_subscriptions", {
      provider: payment.provider,
      subscription_id: stableSubscriptionId,
      order_id: payment.orderId || subscription?.order_id || null,
      user_id: user.id,
      organization_id: organizationId,
      plan_name: planName,
      billing_cycle: billingCycle,
      status: payment.revokeAccess
        ? (payment.status === "refunded" ? "refunded" : "expired")
        : payment.status === "cancelled" ? "cancelled" : "active",
      renews_at: payment.status === "paid" ? payment.periodEndsAt : null,
      ends_at: payment.status === "paid" ? null : payment.periodEndsAt,
      updated_at: now,
    }, "provider,subscription_id")
  }

  // Refunds and expired subscriptions end access now.
  if (payment.revokeAccess) {
    // Lifecycle events can arrive late and out of order. Never let the expiry or
    // refund of a superseded subscription revoke a newer paid plan. activate_plan
    // stamps the currently authoritative subscription/order handle on the user.
    if (isStalePaymentRevocation(user.customer_id, stableSubscriptionId, payment.transactionId)) {
      log.info("payments.stale_revocation_ignored", {
        provider: payment.provider,
        transactionId: payment.transactionId,
        subscriptionId: stableSubscriptionId,
      })
      return { updated: false, stale: true, user, organizationId }
    }
    await revokePlan(user.id, organizationId, now)
    if (payment.status === "refunded") {
      await reverseReferralCommissionFromRefund(user.id)
    }
    log.info("payments.access_revoked", { provider: payment.provider, status: payment.status })
    await sendTransactionalEmail({
      to: user.email,
      subject: "Qalam plan ended",
      text: payment.status === "refunded"
        ? `Your ${planName} payment was refunded and your workspace is back on the Free plan.`
        : `Your ${planName} subscription has ended and your workspace is back on the Free plan.`,
    }).catch(() => undefined)
    return { updated: true, revoked: true, user, organizationId }
  }

  // A deliberate cancellation is not a failure: auto-renew stops, but the period already
  // paid for is honoured. Only correct the expiry to the provider's own end date.
  if (payment.status === "cancelled") {
    // A plan upgrade/downgrade activates a brand-new Lemon Squeezy subscription and
    // auto-cancels the old one (see the stale-subscription cleanup below), which makes
    // the old subscription's own cancellation webhook arrive around the same time the
    // new plan is already active. That event is about a subscription the account has
    // already moved on from - applying its expiry/email here would clobber the new
    // plan's real expiry with the old plan's end date. Only act on a cancellation when
    // it is the account's sole/most-recent Lemon Squeezy subscription; if another one
    // is still active, this is the superseded one and there's nothing to apply here.
    if (payment.provider === "lemonsqueezy" && stableSubscriptionId) {
      const otherActive = await supabaseSelect<{ subscription_id: string }>(
        "payment_subscriptions",
        `user_id=eq.${encodeURIComponent(user.id)}&provider=eq.lemonsqueezy&status=eq.active&subscription_id=neq.${encodeURIComponent(stableSubscriptionId)}&select=subscription_id&limit=1`
      ).catch((err: unknown) => {
        log.error("payments.other_subscription_lookup_failed", { userId: user.id, error: (err as Error).message })
        return []
      })
      if (otherActive.length > 0) {
        log.info("payments.superseded_subscription_cancelled", { provider: payment.provider, subscriptionId: stableSubscriptionId })
        return { updated: false, cancelled: true, user, organizationId }
      }
    }
    if (payment.periodEndsAt) {
      await createServiceClient()
        .from("users")
        .update({ plan_expires_at: payment.periodEndsAt, updated_at: now })
        .eq("id", user.id)
        .then(undefined, (err: unknown) => log.error("payments.cancel_expiry_update_failed", { error: (err as Error).message }))
    }
    log.info("payments.subscription_cancelled", { provider: payment.provider })
    await sendTransactionalEmail({
      to: user.email,
      subject: "Qalam subscription cancelled",
      text: payment.periodEndsAt
        ? `Your ${planName} subscription will not renew. You keep full access until ${new Date(payment.periodEndsAt).toDateString()}.`
        : `Your ${planName} subscription will not renew. You keep full access until the end of your current billing period.`,
    }).catch(() => undefined)
    return { updated: false, cancelled: true, user, organizationId }
  }

  if (payment.status === "partially_refunded") {
    log.info("payments.partial_refund_recorded", {
      provider: payment.provider,
      transactionId: payment.transactionId,
    })
    return { updated: true, partialRefund: true, user, organizationId }
  }

  if (payment.status !== "paid") {
    log.info("payments.not_paid", { status: payment.status, provider: payment.provider })
    await sendTransactionalEmail({
      to: user.email,
      subject: "Qalam payment failed",
      text: `Your payment for ${planName} did not complete. Your plan was not changed.`,
    }).catch(() => undefined)
    return { updated: false, user, organizationId }
  }

  if (payment.creditReferral && payment.amount > 0) {
    await creditReferralCommissionFromPayment(user.id, planName, payment.amount)
  }

  if (!payment.activateAccess) {
    return { updated: true, recorded: payment.recordTransaction, user, organizationId }
  }

  const supabase = createServiceClient()

  // Atomic plan activation via RPC (migration 0031). Falls back to direct table updates
  // if the RPC has not been deployed yet so payments always succeed.
  // The subscription ID is the stable handle across renewals; the transaction ID changes
  // every cycle, so it is only a fallback for one-off orders.
  const customerId = stableSubscriptionId || payment.transactionId

  const { error: rpcError } = await supabase.rpc("activate_plan", {
    p_user_id: user.id,
    p_organization_id: organizationId,
    p_plan_name: planName,
    p_expires_at: expiresAt,
    p_customer_id: customerId,
    p_billing_cycle: billingCycle,
  })

  if (rpcError) {
    log.warn("payments.activate_plan_rpc_unavailable", { error: rpcError.message })
    const { error: userErr } = await supabase
      .from("users")
      .update({
        plan: planName,
        plan_expires_at: expiresAt,
        plan_started_at: now,
        billing_cycle: billingCycle,
        customer_id: customerId,
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
        .update({ plan: planName, subscription_status: "active", plan_expires_at: expiresAt, updated_at: now })
        .eq("id", organizationId)
        .then(undefined, (err: unknown) => log.error("payments.org_plan_update_failed", { error: (err as Error).message }))
    }

    await supabase
      .from("plan_usage")
      .upsert({ user_id: user.id, plan: planName.toLowerCase(), cycle_start: now, cycle_end: expiresAt, updated_at: now }, { onConflict: "user_id" })
      .then(undefined, (err: unknown) => log.error("payments.plan_usage_upsert_failed", { error: (err as Error).message }))
  }

  // Fire-and-forget confirmation email - never block the payment response on this
  sendTransactionalEmail({
    to: user.email,
    subject: `Qalam ${planName} activated`,
    text: `Your ${planName} plan is active until ${expiresAt ? new Date(expiresAt).toDateString() : "your billing renewal"}.`,
  }).catch(() => undefined)

  // Solo and Pro are separate hosted checkout links, each its own Lemon Squeezy
  // product - clicking "Upgrade to Pro" while on Solo starts a brand-new
  // subscription rather than modifying the old one. Left alone, both would keep
  // renewing and the customer would be billed twice every cycle. Whichever
  // subscription just got activated above is the one to keep; cancel any other
  // still-active Lemon Squeezy subscription on this account so it stops renewing.
  //
  // `user` here is only ever resolved via a token-verified user id (see getUser()
  // and the checkout[custom][token] handling in verifyAndExtractPayment) or a
  // subscription record established by an earlier token-verified activation -
  // never from buyer-editable checkout[custom][user_id]/checkout[email] alone -
  // so it is safe to act on "another active subscription for this user" here.
  if (payment.provider === "lemonsqueezy" && stableSubscriptionId) {
    const staleSubscriptions = await supabaseSelect<{ subscription_id: string }>(
      "payment_subscriptions",
      `user_id=eq.${encodeURIComponent(user.id)}&provider=eq.lemonsqueezy&status=eq.active&subscription_id=neq.${encodeURIComponent(stableSubscriptionId)}&select=subscription_id`
    ).catch((err: unknown) => {
      log.error("payments.stale_subscription_lookup_failed", { userId: user.id, error: (err as Error).message })
      return []
    })

    for (const stale of staleSubscriptions) {
      await cancelLemonSqueezySubscription(stale.subscription_id)
        .then(() => log.info("payments.stale_subscription_cancelled", { userId: user.id, subscriptionId: stale.subscription_id }))
        .catch((err: unknown) => log.error("payments.stale_subscription_cancel_failed", {
          userId: user.id,
          subscriptionId: stale.subscription_id,
          error: (err as Error).message,
        }))
    }
  }

  return { updated: true, user, organizationId, expiresAt }
}

const payloadHash = (rawBody: string) =>
  crypto.createHash("sha256").update(rawBody, "utf8").digest("hex")

const sanitizePaymentPayload = (
  provider: PaymentProvider,
  body: Record<string, unknown>,
  fields: {
    eventName: string
    resourceId: string
    orderId: string | null
    subscriptionId: string | null
    variantId: string
    amount: number
    currency: string
    status: PaymentStatus
  }
) => ({
  provider,
  event_name: fields.eventName,
  resource_id: fields.resourceId,
  order_id: fields.orderId,
  subscription_id: fields.subscriptionId,
  variant_id: fields.variantId || null,
  amount: fields.amount,
  currency: fields.currency,
  status: fields.status,
  created_at: textValue(
    objectValue(objectValue(body.data).attributes).created_at,
    objectValue(objectValue(body.data).attributes).updated_at
  ) || null,
})

export const recordPaymentWebhook = async (payment: VerifiedPayment) => {
  const supabase = createServiceClient()
  const { data: claimState, error: claimError } = await supabase.rpc("claim_payment_webhook_v2", {
    p_provider: payment.provider,
    p_event_id: payment.eventId,
  })

  if (claimError) {
    throw new Error(`payment_webhook_claim_failed: ${claimError.message}`)
  }
  if (claimState === "busy") {
    throw new Error("payment_webhook_busy")
  }
  if (claimState === "completed") {
    log.info("payments.duplicate_webhook_ignored", {
      provider: payment.provider,
      eventId: payment.eventId,
    })
    return { updated: false, duplicate: true }
  }
  if (claimState !== "claimed") throw new Error("payment_webhook_claim_invalid")

  try {
    const result = await processPaymentWebhook(payment)
    const { error: completeError } = await supabase
      .from("payment_webhook_events")
      .update({
        processing_state: "completed",
        processed_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", payment.provider)
      .eq("event_id", payment.eventId)

    if (completeError) {
      throw new Error(`payment_webhook_complete_failed: ${completeError.message}`)
    }
    return result
  } catch (error) {
    const message = (error as Error).message || "payment_webhook_processing_failed"
    await supabase
      .from("payment_webhook_events")
      .update({
        processing_state: "failed",
        last_error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("provider", payment.provider)
      .eq("event_id", payment.eventId)
    throw error
  }
}
