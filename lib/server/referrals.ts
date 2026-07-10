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
  const discountPercent = params.discountPercent ?? 20
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

/**
 * Called manually by an admin once a JazzCash/Easypaisa/bank-transfer payment
 * has been verified - there is no automated checkout or webhook in this flow.
 */
export async function markReferralPaid(
  referredUserId: string,
  planName: string,
  amountPaid: number
): Promise<MarkPaidResult> {
  const supabase = createServiceClient()

  const { data: use } = await supabase
    .from("referral_uses")
    .select("id")
    .eq("referred_user_id", referredUserId)
    .maybeSingle()

  if (!use) {
    return { success: false, error: "No referral use found for this user." }
  }

  const { error } = await supabase
    .from("referral_uses")
    .update({
      status: "paid",
      plan_name: planName,
      amount_paid: amountPaid,
      paid_at: new Date().toISOString(),
    })
    .eq("id", use.id)

  if (error) {
    log.error("referrals.mark_paid_failed", { error: error.message })
    return { success: false, error: "Could not mark this referral as paid." }
  }

  log.info("referrals.marked_paid", { referredUserId, planName })
  return { success: true }
}
