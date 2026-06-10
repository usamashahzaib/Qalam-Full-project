import { NextResponse } from "next/server"
import { pingRedis } from "@/lib/server/redis"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET() {
  const [redis, supabase] = await Promise.allSettled([
    pingRedis(),
    (async () => {
      const client = createServiceClient()
      const start = Date.now()
      const { error } = await client.from("users").select("id").limit(1).maybeSingle()
      return { ok: !error, latencyMs: Date.now() - start, error: error?.message }
    })(),
  ])

  const redisResult = redis.status === "fulfilled" ? redis.value : { ok: false, error: String(redis.reason) }
  const supabaseResult = supabase.status === "fulfilled" ? supabase.value : { ok: false, error: String(supabase.reason) }

  const allOk = redisResult.ok && supabaseResult.ok

  return NextResponse.json(
    {
      ok: allOk,
      services: {
        redis: redisResult,
        supabase: supabaseResult,
      },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}
