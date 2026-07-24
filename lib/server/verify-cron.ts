import "server-only"
import { timingSafeEqual } from "node:crypto"
import { env } from "@/lib/server/env"

export function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || ""
  const expected = `Bearer ${env.cronSecret}`
  const gotBuf = Buffer.from(authHeader)
  const wantBuf = Buffer.from(expected)
  if (!env.cronSecret || gotBuf.length !== wantBuf.length) return false
  return timingSafeEqual(gotBuf, wantBuf)
}
