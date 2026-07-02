import "server-only"

import { Redis } from "@upstash/redis"
import { requireRedisEnv } from "./env"

let _client: Redis | null = null

export function getRedis(): Redis | null {
  if (_client) return _client
  const config = requireRedisEnv()
  if (!config) return null
  _client = new Redis({ url: config.url, token: config.token })
  return _client
}

export async function pingRedis(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const client = getRedis()
  if (!client) {
    return {
      ok: false,
      error: "Redis not configured - set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    }
  }
  const start = Date.now()
  try {
    const result = await client.ping()
    return { ok: result === "PONG", latencyMs: Date.now() - start }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}