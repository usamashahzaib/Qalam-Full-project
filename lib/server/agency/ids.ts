import "server-only"

import { generateToken, hashToken } from "@/lib/server/password"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_RE = /^[a-f0-9]{64}$/

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value)

export const inList = (ids: string[]) => `(${ids.filter(isUuid).join(",")})`

export function issuePublicToken(): { token: string; hash: string } {
  const token = generateToken(32)
  return { token, hash: hashToken(token) }
}

/** Returns null for anything that is not a well-formed token, before any DB lookup. */
export function hashPublicToken(token: unknown): string | null {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null
  return hashToken(token)
}
