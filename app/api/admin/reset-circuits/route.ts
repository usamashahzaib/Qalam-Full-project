import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { getAuthenticatedSession, isAdminEmail } from "@/lib/server/workspace"
import { getRedis } from "@/lib/server/redis"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

const requireAdmin = async (request: NextRequest) => {
  const adminKey = request.headers.get("x-admin-key") || ""
  const secretKey = process.env.ADMIN_SECRET_KEY || ""
  const keyBuf = Buffer.from(adminKey)
  const secretBuf = Buffer.from(secretKey)
  if (!secretKey || keyBuf.length !== secretBuf.length || !timingSafeEqual(keyBuf, secretBuf)) throw new Error("Forbidden")
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
  return { email: session.user.email || "", userId: session.user.id }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
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
    await requireAdmin(request)
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
