import "server-only"

import crypto from "node:crypto"
import { createServiceClient } from "@/lib/server/supabase-rest"

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const EXPIRED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

const tokenHash = (token: string) =>
  crypto.createHash("sha256").update(token, "utf8").digest("hex")

export async function createCheckoutSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url")
  const now = Date.now()
  const supabase = createServiceClient()

  const { error } = await supabase.from("billing_checkout_sessions").insert({
    token_hash: tokenHash(token),
    user_id: userId,
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
  })
  if (error) throw new Error(`checkout_session_create_failed: ${error.message}`)

  await supabase
    .from("billing_checkout_sessions")
    .delete()
    .lt("expires_at", new Date(now - EXPIRED_RETENTION_MS).toISOString())
    .then(undefined, () => undefined)

  return token
}

export async function resolveCheckoutSession(token: string): Promise<string | null> {
  if (!token) return null
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const hash = tokenHash(token)
  const { data, error } = await supabase
    .from("billing_checkout_sessions")
    .select("user_id")
    .eq("token_hash", hash)
    .gt("expires_at", now)
    .maybeSingle()

  if (error) throw new Error(`checkout_session_resolve_failed: ${error.message}`)
  if (!data?.user_id) return null

  await supabase
    .from("billing_checkout_sessions")
    .update({ last_used_at: now })
    .eq("token_hash", hash)

  return String(data.user_id)
}
