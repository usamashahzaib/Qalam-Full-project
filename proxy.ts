import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ─── Redis rate limiters ─────────────────────────────────────────────────────
// Lazy-initialized per Edge invocation; state persists in Upstash, not memory.
// Fail-open when Redis is not configured (env vars missing).

let _redis: Redis | null = null
let _generalLimiter: Ratelimit | null = null
let _authLimiter: Ratelimit | null = null

function proxyRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return (_redis = new Redis({ url, token }))
}

function generalLimiter(): Ratelimit | null {
  if (_generalLimiter) return _generalLimiter
  const r = proxyRedis()
  if (!r) return null
  return (_generalLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(600, "60 s"),
    prefix: "rl:proxy",
  }))
}

function authLimiter(): Ratelimit | null {
  if (_authLimiter) return _authLimiter
  const r = proxyRedis()
  if (!r) return null
  return (_authLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:auth",
  }))
}

async function checkRateLimit(ip: string, isAuthRoute: boolean): Promise<boolean> {
  const limiter = isAuthRoute ? authLimiter() : generalLimiter()
  if (!limiter) return true // fail-open when Redis not configured
  const { success } = await limiter.limit(ip)
  return success
}

// ─── Route tables ─────────────────────────────────────────────────────────────

const PROTECTED_ROUTES = [
  "/dashboard",
  "/write",
  "/writer",
  "/carousel",
  "/carousels",
  "/library",
  "/analytics",
  "/voice",
  "/settings",
  "/agency",
  "/agency-setup",
  "/competitors",
  "/calendar",
  "/strategist",
  "/approvals",
  "/chat",
  "/admin",
]

const AUTH_ONLY_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/webhooks",
  "/api/payments/webhook",
  "/api/cron",
  "/api/linkedin/publish-scheduled",
  "/api/linkedin/sync-analytics",
  "/api/free-tools",
  "/api/tools",
  "/api/geo",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  return response
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const ip =
    (request as NextRequest & { ip?: string }).ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"

  const { pathname } = request.nextUrl

  const isPublicApi = PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  // Skip rate limiting entirely for public marketing pages (homepage, pricing, blog, docs, etc.)
  const isPublicPage = !pathname.startsWith("/api/") && !PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  ) && !AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!isPublicPage) {
    // Strict auth limiter applies only to POST submissions on auth pages and /api/auth/signin
    const isAuthRoute = request.method === "POST" && (
      pathname.startsWith("/api/auth/signin") ||
      pathname.startsWith("/api/auth/callback") ||
      AUTH_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
    )
    const rateLimitOk = await checkRateLimit(ip, isAuthRoute)
    if (!rateLimitOk) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      )
    }
  }

  if (isPublicApi) {
    return addSecurityHeaders(NextResponse.next())
  }

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthOnly = AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Public marketing pages pass through without auth check
  const isApiRoute = pathname.startsWith("/api/")
  if (!isProtectedRoute && !isAuthOnly && !isApiRoute) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Read JWT directly - Edge-compatible, no Supabase dependency
  // NextAuth v5 uses "authjs.session-token" (not "next-auth.session-token")
  const isHttps = request.url.startsWith("https://")
  const cookieName = isHttps ? "__Secure-authjs.session-token" : "authjs.session-token"
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName,
  }) ?? await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: isHttps ? "authjs.session-token" : "__Secure-authjs.session-token",
  })
  const userId = token?.id as string | undefined
  const userEmail = token?.email as string | undefined

  if (isAuthOnly && userId) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url))
    )
  }

  if (!userId) {
    // All API routes not in PUBLIC_API_PREFIXES require authentication
    if (isApiRoute) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    }
    if (isAuthOnly) {
      return addSecurityHeaders(NextResponse.next())
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-user-id", userId)
  if (userEmail) requestHeaders.set("x-user-email", userEmail)

  return addSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } })
  )
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
