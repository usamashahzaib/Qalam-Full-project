import "server-only"

import crypto from "node:crypto"
import { env } from "@/lib/server/env"

// Domain-separates this HMAC use from any other use of AUTH_SECRET (e.g. session
// signing), so a token minted here can never be confused with or substituted for
// a token from a different subsystem.
const CONTEXT = "lemonsqueezy-checkout-v1"

const hmac = (payload: string) =>
  crypto.createHmac("sha256", env.authSecret).update(`${CONTEXT}:${payload}`).digest("hex")

/**
 * Mints a short-lived, signed token binding a Lemon Squeezy checkout to the
 * CURRENTLY AUTHENTICATED user (only ever called server-side, from a
 * withAuth-protected route, with the session's own user id - never a
 * client-supplied one). The webhook handler trusts this token, and this
 * token alone, to resolve which account a Lemon Squeezy payment belongs to -
 * unlike checkout[custom][user_id] and checkout[email], which are plain
 * buyer-editable query params an attacker can set to any value before
 * completing checkout with their own card.
 */
export function signCheckoutToken(userId: string, ttlMs = 30 * 60 * 1000): string {
  const expiresAt = Date.now() + ttlMs
  const payload = `${userId}.${expiresAt}`
  const sig = hmac(payload)
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url")
}

/** Returns the bound user id if the token is well-formed, unexpired, and signature-valid; otherwise null. */
export function verifyCheckoutToken(token: string): string | null {
  if (!token) return null
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(".")
    if (parts.length !== 3) return null
    const [userId, expiresAtStr, sig] = parts
    if (!userId || !expiresAtStr || !sig) return null

    const expiresAt = Number(expiresAtStr)
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null

    const expectedSig = hmac(`${userId}.${expiresAtStr}`)
    const given = Buffer.from(sig)
    const expected = Buffer.from(expectedSig)
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null

    return userId
  } catch {
    return null
  }
}

// Domain-separated from the plan-checkout context above so a token minted for
// one purpose can never be replayed as the other.
const ADDON_CONTEXT = "lemonsqueezy-career-addon-checkout-v1"

const addonHmac = (payload: string) =>
  crypto.createHmac("sha256", env.authSecret).update(`${ADDON_CONTEXT}:${payload}`).digest("hex")

/**
 * Mints a short-lived, signed token binding a Lemon Squeezy add-on checkout to
 * a specific pending career_addon_orders row AND the authenticated user who
 * owns it (only ever called server-side, from a withAuth-protected route,
 * after confirming the order belongs to that user). The webhook trusts this
 * token, and this token alone, to resolve which order a payment fulfills -
 * never the buyer-editable checkout[custom] fields.
 */
export function signAddonCheckoutToken(userId: string, orderId: string, ttlMs = 30 * 60 * 1000): string {
  const expiresAt = Date.now() + ttlMs
  const payload = `${userId}.${orderId}.${expiresAt}`
  const sig = addonHmac(payload)
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url")
}

/** Returns the bound {userId, orderId} if the token is well-formed, unexpired, and signature-valid; otherwise null. */
export function verifyAddonCheckoutToken(token: string): { userId: string; orderId: string } | null {
  if (!token) return null
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(".")
    if (parts.length !== 4) return null
    const [userId, orderId, expiresAtStr, sig] = parts
    if (!userId || !orderId || !expiresAtStr || !sig) return null

    const expiresAt = Number(expiresAtStr)
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null

    const expectedSig = addonHmac(`${userId}.${orderId}.${expiresAtStr}`)
    const given = Buffer.from(sig)
    const expected = Buffer.from(expectedSig)
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null

    return { userId, orderId }
  } catch {
    return null
  }
}
