import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { isAdminEmail } from "@/lib/server/workspace"
import { getRedis } from "@/lib/server/redis"

export async function POST(request: NextRequest) {
  return withAuth(async (_req, user) => {
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const redis = getRedis()
    if (!redis) return NextResponse.json({ message: "Redis not configured, circuits not applicable" })

    await Promise.all([
      redis.set("circuit:groq", { failures: 0, lastFailure: 0, state: "closed" }),
      redis.set("circuit:gemini", { failures: 0, lastFailure: 0, state: "closed" }),
    ])

    return NextResponse.json({ message: "Circuit breakers reset. AI services will retry on next request." })
  })(request)
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const redis = getRedis()
    if (!redis) return NextResponse.json({ groq: "no-redis", gemini: "no-redis" })

    const [groq, gemini] = await Promise.all([
      redis.get("circuit:groq"),
      redis.get("circuit:gemini"),
    ])

    return NextResponse.json({ groq: groq || "closed", gemini: gemini || "closed" })
  })(request)
}
