import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { authSecret } from "@/lib/server/env"

/**
 * Signs an OAuth "state" payload so it survives the round trip to the
 * provider and back untampered. LinkedIn only echoes the state string back
 * verbatim - it does not preserve our own query params - so anything the
 * callback needs (like which workspace initiated the connect) has to be
 * packed into state itself rather than read off the callback URL.
 */
export function signOAuthState(payload: Record<string, string | null>): string {
  const body = Buffer.from(JSON.stringify({ ...payload, nonce: randomBytes(8).toString("hex") })).toString("base64url")
  const sig = createHmac("sha256", authSecret).update(body).digest("base64url")
  return `${body}.${sig}`
}

export function verifyOAuthState<T extends Record<string, string | null>>(state: string): T | null {
  const [body, sig] = state.split(".")
  if (!body || !sig) return null
  const expectedSig = createHmac("sha256", authSecret).update(body).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T
  } catch {
    return null
  }
}
