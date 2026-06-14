import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { supabaseInsert, supabasePatch, supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"

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
type MembershipRow = { organization_id: string }

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

const verifyGenericHmac = (rawBody: string, signature: string | null, secret: string) =>
  Boolean(secret && signature && timingSafeEqual(hmacHex(secret, rawBody), signature.replace(/^sha256=/i, "")))

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

const addDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
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

const getPrimaryOrganizationId = async (userId: string) => {
  const memberships = await supabaseSelect<MembershipRow>(
    "memberships",
    `user_id=eq.${encodeURIComponent(userId)}&select=organization_id&limit=1`
  )
  return memberships?.[0]?.organization_id || null
}

export const recordPaymentWebhook = async (payment: VerifiedPayment) => {
  const user = await getUser(payment)
  if (!user) throw new Error("payment_user_not_found")
  const organizationId = await getPrimaryOrganizationId(user.id)
  if (payment.status === "paid" && !organizationId) throw new Error("payment_organization_not_found")

  const expiresAt = payment.status === "paid" ? addDays(payment.billingCycle === "annual" ? 365 : 30) : null
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
    await sendTransactionalEmail({
      to: user.email,
      subject: "Qalam payment failed",
      text: `Your payment for ${payment.planName} did not complete. Your plan was not changed.`,
    })
  return { updated: false, user, organizationId }
  }

  const paidOrganizationId = organizationId as string

  await supabasePatch("organizations", `id=eq.${encodeURIComponent(paidOrganizationId)}`, {
    plan: payment.planName,
    subscription_status: "active",
    plan_expires_at: expiresAt,
    customer_id: payment.transactionId,
    updated_at: new Date().toISOString(),
  })

  await supabasePatch("users", `id=eq.${encodeURIComponent(user.id)}`, {
    plan: payment.planName,
    plan_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })

  // Sync plan_usage so generation limits reflect the new plan immediately
  await supabasePatch("plan_usage", `user_id=eq.${encodeURIComponent(user.id)}`, {
    plan: payment.planName.toLowerCase(),
    updated_at: new Date().toISOString(),
  }).catch(() => undefined)

  await sendTransactionalEmail({
    to: user.email,
    subject: `Qalam ${payment.planName} activated`,
    text: `Your ${payment.planName} plan is active until ${expiresAt ? new Date(expiresAt).toDateString() : "your billing renewal"}.`,
  })

  return { updated: true, user, organizationId, expiresAt }
}
