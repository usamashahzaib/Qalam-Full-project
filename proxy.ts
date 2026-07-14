import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ─── Redis rate limiters ─────────────────────────────────────────────────────
// Lazy-initialized per Edge invocation; state persists in Upstash, not memory.
// Fail-open when Redis is not configured (env vars missing).

let _redis: Redis | null = null
let _generalLimiter: Ratelimit | null = null
let _authIpLimiter: Ratelimit | null = null
let _authEmailLimiter: Ratelimit | null = null

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

// IP limit is raised (20/15m) since it now only guards against broad abuse -
// the tighter per-email limit below is what actually stops credential
// stuffing against a single account, without penalizing shared IPs (offices,
// campuses, carrier-grade NAT) that legitimately host many distinct users.
function authIpLimiter(): Ratelimit | null {
  if (_authIpLimiter) return _authIpLimiter
  const r = proxyRedis()
  if (!r) return null
  return (_authIpLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(20, "15 m"),
    prefix: "rl:auth:ip",
  }))
}

function authEmailLimiter(): Ratelimit | null {
  if (_authEmailLimiter) return _authEmailLimiter
  const r = proxyRedis()
  if (!r) return null
  return (_authEmailLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:auth:email",
  }))
}

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function extractAuthEmail(request: NextRequest): Promise<string | null> {
  try {
    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const body = await request.clone().json()
      return typeof body?.email === "string" && body.email ? body.email : null
    }
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.clone().formData()
      const email = form.get("email")
      return typeof email === "string" && email ? email : null
    }
  } catch {
    return null
  }
  return null
}

// Mirrors getClientIp() in lib/server/rate-limit.ts so the proxy and route
// handlers key rate limits off the same (least-spoofable) client IP. Trust
// platform-injected headers over client-supplied XFF; for XFF take the
// rightmost hop appended by the trusted proxy.
function getClientIp(request: NextRequest): string {
  if ((request as NextRequest & { ip?: string }).ip) {
    return (request as NextRequest & { ip: string }).ip
  }
  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp) return cfIp
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean)
    return hops[hops.length - 1] ?? "unknown"
  }
  return "unknown"
}

async function checkRateLimit(ip: string, isAuthRoute: boolean, request: NextRequest): Promise<boolean> {
  if (isAuthRoute) {
    const ipLimiter = authIpLimiter()
    const emailLimiter = authEmailLimiter()
    if (!ipLimiter && !emailLimiter) return true // fail-open when Redis not configured

    if (ipLimiter) {
      const { success } = await ipLimiter.limit(ip)
      if (!success) return false
    }

    if (emailLimiter) {
      const email = await extractAuthEmail(request)
      if (email) {
        const { success } = await emailLimiter.limit(await hashEmail(email))
        if (!success) return false
      }
    }
    return true
  }

  const limiter = generalLimiter()
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
  "/approvals",
  "/chat",
  "/admin",
  "/silent-growth",
]

const AUTH_ONLY_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/webhooks",
  "/api/payments/webhook",
  "/api/free-tools",
  "/api/tools",
  "/api/geo",
  // Vercel cron endpoints authenticate with CRON_SECRET (Bearer header), not a
  // session cookie - each route validates the secret itself.
  "/api/cron",
  "/api/linkedin/publish-scheduled",
  "/api/linkedin/sync-analytics",
  // Anonymous marketing surfaces: contact form and referral landing tracking.
  // Each route enforces its own Redis-backed rate limit.
  "/api/contact",
  "/api/referrals/click",
  "/api/referrals/validate",
]

// ─── CSP builder ─────────────────────────────────────────────────────────────
// Nonce is generated per HTML request and passed via x-nonce request header so
// Server Components can attach it to any custom <script> tags. Next.js 16
// automatically reads x-nonce and applies it to its own hydration scripts.
// 'strict-dynamic' propagates trust to scripts loaded by nonce-bearing scripts,
// enabling Next.js chunk loading without an allowlist.

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'` + (isDev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.linkedin.com https://*.licdn.com https://*.groq.com https://*.googleapis.com https://*.supabase.co https://*.upstash.io wss://*.supabase.co",
    "img-src 'self' data: blob: https://*.licdn.com https://media.licdn.com https://static.licdn.com https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
    "frame-src 'self' https://*.linkedin.com",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  if (nonce) {
    response.headers.set(
      "Content-Security-Policy",
      buildCsp(nonce, process.env.NODE_ENV === "development")
    )
  }
  return response
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 4 * 1024 * 1024 // 4 MB

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Reject oversized request bodies early - prevents payload-based DoS.
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentLength = request.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Request body too large" }, { status: 413 })
      )
    }
  }

  const ip = getClientIp(request)

  // Baseline sanitized headers used for every pass-through response - strips
  // any inbound x-user-id / x-user-email before they reach downstream
  // handlers, since those are only ever trusted when set below after auth
  // verification succeeds.
  const baseHeaders = () => {
    const headers = new Headers(request.headers)
    headers.delete("x-user-id")
    headers.delete("x-user-email")
    return headers
  }

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
    const rateLimitOk = await checkRateLimit(ip, isAuthRoute, request)
    if (!rateLimitOk) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      )
    }
  }

  // Generate a per-request nonce for HTML pages (not API routes or static assets).
  // The nonce is forwarded as x-nonce so Server Components can stamp it on any
  // inline <script> they own. Next.js 16 reads x-nonce internally and applies it
  // to its own hydration script bundles, so no manual wiring is needed there.
  const isHtmlPage = !pathname.startsWith("/api/")
  const nonce = isHtmlPage
    ? Buffer.from(crypto.randomUUID()).toString("base64")
    : undefined

  if (isPublicApi) {
    return addSecurityHeaders(
      NextResponse.next({ request: { headers: baseHeaders() } }),
      nonce
    )
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
    const requestHeaders = baseHeaders()
    if (nonce) requestHeaders.set("x-nonce", nonce)
    return addSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce
    )
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
      NextResponse.redirect(new URL("/dashboard", request.url)),
      nonce
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
      const requestHeaders = baseHeaders()
      if (nonce) requestHeaders.set("x-nonce", nonce)
      return addSecurityHeaders(
        NextResponse.next({ request: { headers: requestHeaders } }),
        nonce
      )
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl), nonce)
  }

  const requestHeaders = baseHeaders()
  requestHeaders.set("x-user-id", userId)
  if (userEmail) requestHeaders.set("x-user-email", userEmail)
  if (nonce) requestHeaders.set("x-nonce", nonce)

  return addSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce
  )
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
