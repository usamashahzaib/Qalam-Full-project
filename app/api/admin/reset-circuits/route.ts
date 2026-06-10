import { NextResponse } from "next/server"
import { getRedis } from "@/lib/server/redis"
import { isAdmin } from "@/lib/server/auth-helpers"

export async function POST() {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const redis = getRedis()
    if (!redis) return NextResponse.json({ message: "Redis not configured, circuits not applicable" })

    await Promise.all([
      redis.set("circuit:groq", { failures: 0, lastFailure: 0, state: "closed" }),
      redis.set("circuit:gemini", { failures: 0, lastFailure: 0, state: "closed" }),
    ])

    return NextResponse.json({ message: "Circuit breakers reset. AI services will retry on next request." })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const redis = getRedis()
    if (!redis) return NextResponse.json({ groq: "no-redis", gemini: "no-redis" })

    const [groq, gemini] = await Promise.all([
      redis.get("circuit:groq"),
      redis.get("circuit:gemini"),
    ])

    return NextResponse.json({ groq: groq || "closed", gemini: gemini || "closed" })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
