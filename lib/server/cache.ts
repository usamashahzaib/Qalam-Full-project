import "server-only"

import { getRedis } from "./redis"

export function generateCacheKey(params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("&")
  return `cache:${Buffer.from(sorted).toString("base64url")}`
}

export async function getCachedResult<T>(key: string): Promise<T | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const raw = await r.get<string>(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function setCachedResult(
  key: string,
  value: unknown,
  ttl: number = 3600,
): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    await r.setex(key, ttl, JSON.stringify(value))
  } catch {
    // non-fatal
  }
}