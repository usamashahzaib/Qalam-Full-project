import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"

type Bucket = { count: number; resetTime: number }

const ipRequestMap = new Map<string, Bucket>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 100

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of ipRequestMap) {
    if (bucket.resetTime < now) ipRequestMap.delete(key)
  }
}, WINDOW_MS)

const protectedPaths = [
  "/write",
  "/dashboard",
  "/library",
  "/voice",
  "/carousel",
  "/strategist",
  "/admin",
  "/agency-setup",
]

const publicApiPrefixes = ["/api/auth", "/api/health", "/api/webhooks"]

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  return response
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = `ip:${ip}`
  const bucket = ipRequestMap.get(key)
  if (!bucket || bucket.resetTime < now) {
    ipRequestMap.set(key, { count: 1, resetTime: now + WINDOW_MS })
    return true
  }
  if (bucket.count >= MAX_REQUESTS) return false
  bucket.count += 1
  return true
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const ip =
    (request as NextRequest & { ip?: string }).ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"

  if (!checkRateLimit(ip)) {
    return addSecurityHeaders(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    )
  }

  const { pathname } = request.nextUrl

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
  const isApiRoute = pathname.startsWith("/api/")
  const isPublicApi = publicApiPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected || (isApiRoute && !isPublicApi)) {
    const session = await auth()
    if (!session) {
      if (isApiRoute) {
        return addSecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        )
      }
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return addSecurityHeaders(NextResponse.redirect(loginUrl))
    }
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
