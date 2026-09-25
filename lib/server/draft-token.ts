import "server-only"

import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { getRedis } from "@/lib/server/redis"

// Scoring a draft the writer just generated used to spend a separate "analysis" credit, and
// the writer re-scores on every editing pause. Solo has 30 drafts and 10 analyses a month, so
// scores ran out a third of the way through the drafts and publishing locked, because the
// publish gate needs a score. A score of your own draft is now part of that draft's credit.
//
// The token proves the draft came from a paid generation for this user and workspace. It is
// signed, so the client cannot mint one, and it covers a fixed number of scores, so it cannot
// be used to score unlimited unrelated text.

const CONTEXT = "writer-draft-v1"
export const SCORES_PER_DRAFT = 10
const TTL_MS = 24 * 60 * 60 * 1000

const hmac = (payload: string) =>
  crypto.createHmac("sha256", env.authSecret).update(`${CONTEXT}:${payload}`).digest("hex")

export function signDraftToken(billingUserId: string, workspaceId: string | null): string {
  const draftId = crypto.randomUUID()
  const expiresAt = Date.now() + TTL_MS
  const payload = `${draftId}.${billingUserId}.${workspaceId ?? ""}.${expiresAt}`
  return Buffer.from(`${payload}.${hmac(payload)}`, "utf8").toString("base64url")
}

/** The draft id when the token is genuine, unexpired and issued to this user and workspace. */
export function verifyDraftToken(token: unknown, billingUserId: string, workspaceId: string | null): string | null {
  if (typeof token !== "string" || !token || token.length > 512) return null
  try {
    const parts = Buffer.from(token, "base64url").toString("utf8").split(".")
    if (parts.length !== 5) return null
    const [draftId, userId, workspace, expiresAtStr, sig] = parts
    if (userId !== billingUserId || workspace !== (workspaceId ?? "")) return null
    const expiresAt = Number(expiresAtStr)
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null
    const expected = Buffer.from(hmac(`${draftId}.${userId}.${workspace}.${expiresAtStr}`))
    const given = Buffer.from(sig)
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
    return draftId
  } catch {
    return null
  }
}

/**
 * Claims one included score for the draft. False when the draft has used its allowance or
 * the counter is unavailable, in which case the caller charges an analysis as before.
 */
export async function claimIncludedScore(draftId: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const key = `draft-scores:${draftId}`
    const used = await redis.incr(key)
    if (used === 1) await redis.pexpire(key, TTL_MS)
    return used <= SCORES_PER_DRAFT
  } catch {
    return false
  }
}

/** Gives back a claimed score when scoring failed. */
export async function releaseIncludedScore(draftId: string): Promise<void> {
  await getRedis()?.decr(`draft-scores:${draftId}`).catch(() => undefined)
}
