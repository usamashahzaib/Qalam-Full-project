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

const PROTECTED_API_ROUTES = [
  "/api/generate",
  "/api/carousel",
  "/api/voice",
  "/api/posts",
  "/api/analytics",
]

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/health", "/api/webhooks", "/api/free-tools", "/api/tools", "/api/geo"]

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

  const isPublicApi = PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isPublicApi) {
    return addSecurityHeaders(NextResponse.next())
  }

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isProtectedApi = PROTECTED_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthOnly = AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!isProtectedRoute && !isProtectedApi && !isAuthOnly) {
    return addSecurityHeaders(NextResponse.next())
  }

  const session = await auth()

  // Redirect authenticated users away from auth pages
  if (isAuthOnly && session?.user?.id) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url))
    )
  }

  if (!session?.user?.id) {
    if (isProtectedApi) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    }
    // Allow unauthenticated users to access auth-only pages (login, signup, etc.)
    if (isAuthOnly) {
      return addSecurityHeaders(NextResponse.next())
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-user-id", session.user.id)
  if (session.user.email) requestHeaders.set("x-user-email", session.user.email)

  return addSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } })
  )
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
