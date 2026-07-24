import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"
import { getRedis } from "@/lib/server/redis"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function POST(request: NextRequest) {
  try {
    await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const redis = getRedis()
  if (!redis) return NextResponse.json({ message: "Redis not configured, circuits not applicable" })

  await Promise.all([
    redis.set("circuit:groq", { failures: 0, lastFailure: 0, state: "closed" }),
    redis.set("circuit:gemini", { failures: 0, lastFailure: 0, state: "closed" }),
  ])

  return NextResponse.json({ message: "Circuit breakers reset. AI services will retry on next request." })
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const redis = getRedis()
  if (!redis) return NextResponse.json({ groq: "no-redis", gemini: "no-redis" })

  const [groq, gemini] = await Promise.all([
    redis.get("circuit:groq"),
    redis.get("circuit:gemini"),
  ])

  return NextResponse.json({ groq: groq || "closed", gemini: gemini || "closed" })
}
