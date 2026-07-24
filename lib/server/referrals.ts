import "server-only"

import crypto from "node:crypto"
import { createServiceClient } from "./supabase-rest"
import { log } from "./logging"

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // no 0/O, 1/I/L
const MAX_GENERATE_ATTEMPTS = 5
const MAX_INCREMENT_ATTEMPTS = 3

export type ReferralRow = {
  id: string
  referrer_user_id: string | null
  referrer_name: string
  referrer_email: string
  referral_code: string
  discount_percent: number
  max_uses: number | null
  used_count: number
  click_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export type ReferralValidation = {
  valid: boolean
  discountPercent: number
  remainingUses: number | null
  referrerName?: string
  error?: string
}

export type ReferralApplyResult = {
  success: boolean
  discountPercent: number
  error?: string
}

export type ReferralStats = {
  codes: Array<{
    code: string
    usedCount: number
    maxUses: number | null
    discountPercent: number
    clickCount: number
    isActive: boolean
    createdAt: string
  }>
  totalClicks: number
  totalReferred: number
  totalPaidConversions: number
  totalRevenue: number
}

export type LeaderboardEntry = {
  referrerName: string
  referrerEmail: string
  codes: string[]
  totalClicks: number
  totalSignups: number
  totalPaidConversions: number
  totalRevenue: number
}

const slugify = (value: string, maxLen = 12): string => {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
  return (cleaned || "REF").slice(0, maxLen)
}

const randomSuffix = (len = 4): string => {
  let out = ""
  const bytes = crypto.randomBytes(len)
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return out
}

const hashIp = (ip: string): string =>
  crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16)

/**
 * Generates a unique code in the form QALAM-<NAME>-<DEPT>-<SEQ>, e.g. QALAM-ALI-HR-001.
 * Falls back to a random 4-char suffix instead of a sequence number if collisions persist.
 */
export async function generateReferralCode(params: {
  referrerUserId?: string | null
  referrerName: string
  referrerEmail: string
  department?: string
  discountPercent?: number
  maxUses?: number | null
  expiresAt?: Date | null
}): Promise<{ code: string; id: string }> {
  const supabase = createServiceClient()
  const namePart = slugify(params.referrerName.split(" ")[0] || params.referrerName)
  const deptPart = slugify(params.department || "REF", 6)
  const discountPercent = params.discountPercent ?? 10
  const email = params.referrerEmail.trim().toLowerCase()

  const { count } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_email", email)

  let sequence = (count ?? 0) + 1

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const seqPart = attempt === 0 ? String(sequence).padStart(3, "0") : randomSuffix(4)
    const code = `QALAM-${namePart}-${deptPart}-${seqPart}`

    const { data, error } = await supabase
      .from("referrals")
      .insert({
        referrer_user_id: params.referrerUserId || null,
        referrer_name: params.referrerName.trim(),
        referrer_email: email,
        referral_code: code,
        discount_percent: discountPercent,
        max_uses: params.maxUses ?? null,
        expires_at: params.expiresAt ? params.expiresAt.toISOString() : null,
      })
      .select("id")
      .single()

    if (!error && data) {
      return { code, id: data.id as string }
    }

    // Unique violation - try again with a random suffix.
    if (error && error.code !== "23505") {
      log.error("referrals.generate_failed", { error: error.message })
      throw new Error("referral_code_generation_failed")
    }
    sequence += 1
  }

  throw new Error("referral_code_generation_exhausted")
}

export async function validateReferralCode(rawCode: string): Promise<ReferralValidation> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { valid: false, discountPercent: 0, remainingUses: null, error: "Code is required." }

  const supabase = createServiceClient()
  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrer_name, discount_percent, max_uses, used_count, expires_at, is_active")
    .eq("referral_code", code)
    .maybeSingle()

  if (!referral) {
    return { valid: false, discountPercent: 0, remainingUses: null, error: "Referral code not found." }
  }
  if (!referral.is_active) {
    return { valid: false, discountPercent: 0, remainingUses: null, error: "This referral code is no longer active." }
  }
  if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
    return { valid: false, discountPercent: 0, remainingUses: null, error: "This referral code has expired." }
  }
  if (referral.max_uses != null && referral.used_count >= referral.max_uses) {
    return { valid: false, discountPercent: 0, remainingUses: 0, error: "This referral code has reached its usage limit." }
  }

  const remainingUses = referral.max_uses != null ? Math.max(0, referral.max_uses - referral.used_count) : null
  return {
    valid: true,
    discountPercent: referral.discount_percent,
    remainingUses,
    referrerName: referral.referrer_name,
  }
}

export async function trackReferralClick(
  rawCode: string,
  ctx: { ip?: string; userAgent?: string | null; landingPath?: string | null }
): Promise<{ tracked: boolean }> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { tracked: false }

  const supabase = createServiceClient()
  const { data: referral } = await supabase
    .from("referrals")
    .select("id, click_count")
    .eq("referral_code", code)
    .eq("is_active", true)
    .maybeSingle()

  if (!referral) return { tracked: false }

  await supabase.from("referral_clicks").insert({
    referral_id: referral.id,
    ip_hash: ctx.ip ? hashIp(ctx.ip) : null,
    user_agent: ctx.userAgent || null,
    landing_path: ctx.landingPath || null,
  })

  for (let attempt = 0; attempt < MAX_INCREMENT_ATTEMPTS; attempt++) {
    const { data: current } = await supabase
      .from("referrals")
      .select("click_count")
      .eq("id", referral.id)
      .maybeSingle()
    const clickCount = current?.click_count ?? 0
    const { data: updated } = await supabase
      .from("referrals")
      .update({ click_count: clickCount + 1 })
      .eq("id", referral.id)
      .eq("click_count", clickCount)
      .select("id")
      .maybeSingle()
    if (updated) break
  }

  return { tracked: true }
}

export async function applyReferralCode(rawCode: string, referredUserId: string): Promise<ReferralApplyResult> {
  const code = rawCode.trim().toUpperCase()
  const supabase = createServiceClient()

  const validation = await validateReferralCode(code)
  if (!validation.valid) {
    return { success: false, discountPercent: 0, error: validation.error || "invalid_referral_code" }
  }

  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrer_user_id, referrer_email, discount_percent, used_count")
    .eq("referral_code", code)
    .maybeSingle()

  if (!referral) {
    return { success: false, discountPercent: 0, error: "Referral code not found." }
  }

  if (referral.referrer_user_id && referral.referrer_user_id === referredUserId) {
    return { success: false, discountPercent: 0, error: "self_referral_not_allowed" }
  }

  const { data: referredUser } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", referredUserId)
    .maybeSingle()

  if (referredUser?.email && referredUser.email.trim().toLowerCase() === referral.referrer_email) {
    return { success: false, discountPercent: 0, error: "self_referral_not_allowed" }
  }

  const { data: existingUse } = await supabase
    .from("referral_uses")
    .select("id")
    .eq("referred_user_id", referredUserId)
    .maybeSingle()

  if (existingUse) {
    return { success: false, discountPercent: 0, error: "referral_already_used" }
  }

  const { error: insertError } = await supabase.from("referral_uses").insert({
    referral_id: referral.id,
    referred_user_id: referredUserId,
    discount_applied: referral.discount_percent,
  })

  if (insertError) {
    // Unique violation on referred_user_id means a concurrent request won the race.
    if (insertError.code === "23505") {
      return { success: false, discountPercent: 0, error: "referral_already_used" }
    }
    log.error("referrals.apply_insert_failed", { error: insertError.message })
    return { success: false, discountPercent: 0, error: "referral_apply_failed" }
  }

  for (let attempt = 0; attempt < MAX_INCREMENT_ATTEMPTS; attempt++) {
    const { data: current } = await supabase
      .from("referrals")
      .select("used_count")
      .eq("id", referral.id)
      .maybeSingle()
    const usedCount = current?.used_count ?? referral.used_count
    const { data: updated } = await supabase
      .from("referrals")
      .update({ used_count: usedCount + 1, updated_at: new Date().toISOString() })
      .eq("id", referral.id)
      .eq("used_count", usedCount)
      .select("id")
      .maybeSingle()
    if (updated) break
  }

  await supabase
    .from("plan_usage")
    .update({ referral_discount_percent: referral.discount_percent, updated_at: new Date().toISOString() })
    .eq("user_id", referredUserId)
    .then(undefined, (err: unknown) => log.error("referrals.plan_usage_update_failed", { error: (err as Error).message }))

  log.info("referrals.applied", { referralId: referral.id, discountPercent: referral.discount_percent })
  return { success: true, discountPercent: referral.discount_percent }
}

export async function getDiscountForUser(userId: string): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("plan_usage")
    .select("referral_discount_percent")
    .eq("user_id", userId)
    .maybeSingle()
  return data?.referral_discount_percent ?? 0
}

export async function getReferralStats(userId: string, userEmail?: string | null): Promise<ReferralStats> {
  const supabase = createServiceClient()
  const email = userEmail?.trim().toLowerCase()

  const orFilter = email
    ? `referrer_user_id.eq.${userId},referrer_email.eq.${email}`
    : `referrer_user_id.eq.${userId}`

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, referral_code, used_count, max_uses, discount_percent, click_count, is_active, created_at")
    .or(orFilter)
    .order("created_at", { ascending: false })

  const rows = referrals || []
  if (rows.length === 0) {
    return { codes: [], totalClicks: 0, totalReferred: 0, totalPaidConversions: 0, totalRevenue: 0 }
  }

  const referralIds = rows.map((r) => r.id)
  const { data: uses } = await supabase
    .from("referral_uses")
    .select("referral_id, referred_user_id, status, amount_paid")
    .in("referral_id", referralIds)

  let totalPaidConversions = 0
  let totalRevenue = 0
  for (const use of uses || []) {
    if (use.status === "paid") {
      totalPaidConversions += 1
      totalRevenue += Number(use.amount_paid ?? 0)
    }
  }

  return {
    codes: rows.map((r) => ({
      code: r.referral_code,
      usedCount: r.used_count,
      maxUses: r.max_uses,
      discountPercent: r.discount_percent,
      clickCount: r.click_count,
      isActive: r.is_active,
      createdAt: r.created_at,
    })),
    totalClicks: rows.reduce((sum, r) => sum + r.click_count, 0),
    totalReferred: (uses || []).length,
    totalPaidConversions,
    totalRevenue,
  }
}

export async function getAdminLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createServiceClient()

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, referral_code, referrer_name, referrer_email, click_count")
    .order("referrer_email", { ascending: true })

  const rows = referrals || []
  if (rows.length === 0) return []

  const referralIds = rows.map((r) => r.id)
  const { data: uses } = await supabase
    .from("referral_uses")
    .select("referral_id, status, amount_paid")
    .in("referral_id", referralIds)

  const usesByReferral = new Map<string, { status: string; amount_paid: number }[]>()
  for (const use of uses || []) {
    const list = usesByReferral.get(use.referral_id) || []
    list.push({ status: use.status, amount_paid: Number(use.amount_paid ?? 0) })
    usesByReferral.set(use.referral_id, list)
  }

  const byReferrer = new Map<string, LeaderboardEntry>()
  for (const referral of rows) {
    const key = referral.referrer_email
    const existing: LeaderboardEntry = byReferrer.get(key) || {
      referrerName: referral.referrer_name,
      referrerEmail: referral.referrer_email,
      codes: [],
      totalClicks: 0,
      totalSignups: 0,
      totalPaidConversions: 0,
      totalRevenue: 0,
    }
    const referredUses = usesByReferral.get(referral.id) || []
    existing.codes.push(referral.referral_code)
    existing.totalClicks += referral.click_count
    existing.totalSignups += referredUses.length
    for (const use of referredUses) {
      if (use.status === "paid") {
        existing.totalPaidConversions += 1
        existing.totalRevenue += use.amount_paid
      }
    }
    byReferrer.set(key, existing)
  }

  return [...byReferrer.values()].sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalSignups - a.totalSignups)
}

export type ReferralUseDetail = {
  referredUserId: string
  referredUserEmail: string
  referredUserName: string
  referralCode: string
  referrerName: string
  referrerEmail: string
  discountApplied: number
  status: "pending" | "verified" | "paid"
  planName: string | null
  amountPaid: number
  paidAt: string | null
  createdAt: string
}

/**
 * Flat list of every referred user for the admin dashboard's "Mark Paid" table -
 * the leaderboard above is aggregated per referrer and can't drive a per-user action.
 */
export async function getAdminReferralUses(): Promise<ReferralUseDetail[]> {
  const supabase = createServiceClient()

  const { data: uses } = await supabase
    .from("referral_uses")
    .select("id, referral_id, referred_user_id, discount_applied, status, plan_name, amount_paid, paid_at, created_at")
    .order("created_at", { ascending: false })

  const rows = uses || []
  if (rows.length === 0) return []

  const referralIds = [...new Set(rows.map((u) => u.referral_id))]
  const referredUserIds = [...new Set(rows.map((u) => u.referred_user_id))]

  const [{ data: referrals }, { data: users }] = await Promise.all([
    supabase.from("referrals").select("id, referral_code, referrer_name, referrer_email").in("id", referralIds),
    supabase.from("users").select("id, email, full_name").in("id", referredUserIds),
  ])

  const referralById = new Map((referrals || []).map((r) => [r.id, r]))
  const userById = new Map((users || []).map((u) => [u.id, u]))

  return rows.map((use) => {
    const referral = referralById.get(use.referral_id)
    const user = userById.get(use.referred_user_id)
    return {
      referredUserId: use.referred_user_id,
      referredUserEmail: user?.email || "",
      referredUserName: user?.full_name || user?.email || "Unknown",
      referralCode: referral?.referral_code || "",
      referrerName: referral?.referrer_name || "",
      referrerEmail: referral?.referrer_email || "",
      discountApplied: use.discount_applied,
      status: (use.status as ReferralUseDetail["status"]) || "pending",
      planName: use.plan_name,
      amountPaid: Number(use.amount_paid ?? 0),
      paidAt: use.paid_at,
      createdAt: use.created_at,
    }
  })
}

export type MarkPaidResult = { success: boolean; error?: string }

type ApplyPaymentOutcome =
  | { credited: true; commissionAmount: number }
  | { credited: false; reason: "not_referred" | "already_credited" | "update_failed" }

/**
 * Shared by the admin's manual mark-paid flow and the automated payment webhook.
 * Commission accrues once per referred user (first payment only) - if the row is
 * already 'paid' this is a renewal or a duplicate webhook delivery, not a new
 * commission event, so it is a no-op rather than double-crediting the referrer.
 */
async function applyReferralPayment(
  referredUserId: string,
  planName: string,
  amountPaid: number
): Promise<ApplyPaymentOutcome> {
  const supabase = createServiceClient()

  const { data: use } = await supabase
    .from("referral_uses")
    .select("id, status, commission_percent")
    .eq("referred_user_id", referredUserId)
    .maybeSingle()

  if (!use) return { credited: false, reason: "not_referred" }
  if (use.status === "paid") return { credited: false, reason: "already_credited" }

  const commissionAmount = Math.round(amountPaid * (use.commission_percent / 100) * 100) / 100

  const { error } = await supabase
    .from("referral_uses")
    .update({
      status: "paid",
      plan_name: planName,
      amount_paid: amountPaid,
      commission_amount: commissionAmount,
      paid_at: new Date().toISOString(),
    })
    .eq("id", use.id)

  if (error) {
    log.error("referrals.apply_payment_failed", { error: error.message })
    return { credited: false, reason: "update_failed" }
  }

  return { credited: true, commissionAmount }
}

/**
 * Called manually by an admin once a JazzCash/Easypaisa/bank-transfer payment
 * has been verified for a referred user paying outside the Lemon Squeezy checkout.
 */
export async function markReferralPaid(
  referredUserId: string,
  planName: string,
  amountPaid: number
): Promise<MarkPaidResult> {
  const outcome = await applyReferralPayment(referredUserId, planName, amountPaid)
  if (!outcome.credited) {
    if (outcome.reason === "not_referred") return { success: false, error: "No referral use found for this user." }
    if (outcome.reason === "already_credited") return { success: false, error: "This referral has already been marked paid." }
    return { success: false, error: "Could not mark this referral as paid." }
  }

  log.info("referrals.marked_paid", { referredUserId, planName, commissionAmount: outcome.commissionAmount })
  return { success: true }
}

/**
 * Called from the Lemon Squeezy payment webhook after a plan activates. Most
 * paying users were never referred, so "not referred" is the expected common
 * case and is not logged as an error.
 */
export async function creditReferralCommissionFromPayment(
  referredUserId: string,
  planName: string,
  amountPaid: number
): Promise<{ credited: boolean }> {
  const outcome = await applyReferralPayment(referredUserId, planName, amountPaid)
  if (outcome.credited) {
    log.info("referrals.commission_credited", { referredUserId, planName, commissionAmount: outcome.commissionAmount })
  }
  return { credited: outcome.credited }
}

// ── Payouts ─────────────────────────────────────────────────────────────────

export const MIN_PAYOUT_PKR = 1000
const PAYOUT_METHODS = new Set(["jazzcash", "easypaisa", "bank"])

export type PayoutBalance = {
  totalCommission: number
  pendingPayout: number
  paidOut: number
  availableBalance: number
}

export type PayoutRow = {
  id: string
  amount: number
  status: "pending" | "processing" | "paid" | "rejected"
  paymentMethod: string
  accountDetails: string
  paymentReference: string | null
  adminNote: string | null
  createdAt: string
  processedAt: string | null
}

async function getReferrerReferralIds(referrerId: string, referrerEmail?: string | null): Promise<string[]> {
  const supabase = createServiceClient()
  const email = referrerEmail?.trim().toLowerCase()
  const orFilter = email
    ? `referrer_user_id.eq.${referrerId},referrer_email.eq.${email}`
    : `referrer_user_id.eq.${referrerId}`

  const { data } = await supabase.from("referrals").select("id").or(orFilter)
  return (data || []).map((r) => r.id)
}

export async function getPayoutBalance(referrerId: string, referrerEmail?: string | null): Promise<PayoutBalance> {
  const supabase = createServiceClient()
  const referralIds = await getReferrerReferralIds(referrerId, referrerEmail)

  let totalCommission = 0
  if (referralIds.length > 0) {
    const { data: uses } = await supabase
      .from("referral_uses")
      .select("commission_amount")
      .in("referral_id", referralIds)
      .eq("status", "paid")
    totalCommission = (uses || []).reduce((sum, u) => sum + Number(u.commission_amount ?? 0), 0)
  }

  const { data: payouts } = await supabase
    .from("referral_payouts")
    .select("amount, status")
    .eq("referrer_user_id", referrerId)

  let pendingPayout = 0
  let paidOut = 0
  for (const payout of payouts || []) {
    const amount = Number(payout.amount ?? 0)
    if (payout.status === "pending" || payout.status === "processing") pendingPayout += amount
    else if (payout.status === "paid") paidOut += amount
  }

  const availableBalance = Math.max(0, totalCommission - pendingPayout - paidOut)
  return { totalCommission, pendingPayout, paidOut, availableBalance }
}

export async function getPayouts(referrerId: string): Promise<PayoutRow[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("referral_payouts")
    .select("id, amount, status, payment_method, account_details, payment_reference, admin_note, created_at, processed_at")
    .eq("referrer_user_id", referrerId)
    .order("created_at", { ascending: false })

  return (data || []).map((p) => ({
    id: p.id,
    amount: Number(p.amount ?? 0),
    status: p.status as PayoutRow["status"],
    paymentMethod: p.payment_method,
    accountDetails: p.account_details,
    paymentReference: p.payment_reference,
    adminNote: p.admin_note,
    createdAt: p.created_at,
    processedAt: p.processed_at,
  }))
}

export type RequestPayoutResult = { success: boolean; payoutId?: string; error?: string }

/**
 * Balance check and insert happen atomically in the request_referral_payout()
 * RPC (migration 0063) - concurrent requests from the same referrer are
 * serialized by an advisory lock inside the function so a burst of requests
 * can no longer all read the same pre-insert balance and over-withdraw.
 */
export async function requestPayout(
  referrerId: string,
  referrerEmail: string | null | undefined,
  amount: number,
  paymentMethod: string,
  accountDetails: string
): Promise<RequestPayoutResult> {
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT_PKR) {
    return { success: false, error: `Minimum payout is PKR ${MIN_PAYOUT_PKR.toLocaleString("en-PK")}.` }
  }
  if (!PAYOUT_METHODS.has(paymentMethod)) {
    return { success: false, error: "Choose a valid payment method." }
  }
  const details = accountDetails.trim()
  if (!details) {
    return { success: false, error: "Account details are required." }
  }

  const referralIds = await getReferrerReferralIds(referrerId, referrerEmail)

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc("request_referral_payout", {
    p_referrer_id: referrerId,
    p_referral_ids: referralIds,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_account_details: details,
  })

  if (error) {
    if (error.message?.includes("insufficient_balance")) {
      return { success: false, error: "Requested amount exceeds your available balance." }
    }
    log.error("referrals.request_payout_failed", { error: error.message })
    return { success: false, error: "Could not submit payout request. Please try again." }
  }

  log.info("referrals.payout_requested", { referrerId, amount })
  return { success: true, payoutId: data as string }
}

export type AdminPayoutRow = PayoutRow & {
  referrerUserId: string
  referrerName: string
  referrerEmail: string
}

export async function getAdminPayoutQueue(): Promise<AdminPayoutRow[]> {
  const supabase = createServiceClient()
  const { data: payouts } = await supabase
    .from("referral_payouts")
    .select("id, referrer_user_id, amount, status, payment_method, account_details, payment_reference, admin_note, created_at, processed_at")
    .order("created_at", { ascending: false })

  const rows = payouts || []
  if (rows.length === 0) return []

  const userIds = [...new Set(rows.map((p) => p.referrer_user_id))]
  const { data: users } = await supabase.from("users").select("id, email, full_name").in("id", userIds)
  const userById = new Map((users || []).map((u) => [u.id, u]))

  return rows.map((p) => {
    const user = userById.get(p.referrer_user_id)
    return {
      id: p.id,
      referrerUserId: p.referrer_user_id,
      referrerName: user?.full_name || user?.email || "Unknown",
      referrerEmail: user?.email || "",
      amount: Number(p.amount ?? 0),
      status: p.status as PayoutRow["status"],
      paymentMethod: p.payment_method,
      accountDetails: p.account_details,
      paymentReference: p.payment_reference,
      adminNote: p.admin_note,
      createdAt: p.created_at,
      processedAt: p.processed_at,
    }
  })
}

export type PayoutActionResult = { success: boolean; error?: string }

/** pending -> processing. Signals the admin has picked this up to action manually. */
export async function approvePayout(payoutId: string): Promise<PayoutActionResult> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("referral_payouts")
    .update({ status: "processing" })
    .eq("id", payoutId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (error) {
    log.error("referrals.approve_payout_failed", { error: error.message })
    return { success: false, error: "Could not approve payout." }
  }
  if (!data) return { success: false, error: "Payout is not pending." }
  log.info("referrals.payout_approved", { payoutId })
  return { success: true }
}

/** pending/processing -> rejected. Releases the amount back into the referrer's available balance. */
export async function rejectPayout(payoutId: string, adminNote?: string): Promise<PayoutActionResult> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("referral_payouts")
    .update({ status: "rejected", admin_note: adminNote?.trim() || null, processed_at: new Date().toISOString() })
    .eq("id", payoutId)
    .in("status", ["pending", "processing"])
    .select("id")
    .maybeSingle()

  if (error) {
    log.error("referrals.reject_payout_failed", { error: error.message })
    return { success: false, error: "Could not reject payout." }
  }
  if (!data) return { success: false, error: "Payout is not pending or processing." }
  log.info("referrals.payout_rejected", { payoutId })
  return { success: true }
}

/** processing -> paid. Requires the manual transfer reference the admin just sent. */
export async function markPayoutPaid(payoutId: string, paymentReference: string): Promise<PayoutActionResult> {
  const reference = paymentReference.trim()
  if (!reference) return { success: false, error: "Payment reference is required." }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("referral_payouts")
    .update({ status: "paid", payment_reference: reference, processed_at: new Date().toISOString() })
    .eq("id", payoutId)
    .in("status", ["pending", "processing"])
    .select("id")
    .maybeSingle()

  if (error) {
    log.error("referrals.mark_payout_paid_failed", { error: error.message })
    return { success: false, error: "Could not mark payout as paid." }
  }
  if (!data) return { success: false, error: "Payout is not pending or processing." }
  log.info("referrals.payout_paid", { payoutId })
  return { success: true }
}
