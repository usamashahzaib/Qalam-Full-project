import { auth } from "@/auth"
import { NextResponse, type NextRequest } from "next/server"

type Bucket = { count: number; resetTime: number }

const buckets = new Map<string, Bucket>()
const WINDOW_MS = 60_000
const LIMIT = 100
let lastCleanup = 0

const protectedPaths = ["/write", "/dashboard", "/library", "/voice", "/carousel", "/strategist", "/admin", "/agency-setup"]
const publicApi = ["/api/auth", "/api/health", "/api/webhooks"]

const setSecurityHeaders = (response: NextResponse) => {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  return response
}

const clientIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"

const rateLimit = (ip: string) => {
  const now = Date.now()
  if (now - lastCleanup > WINDOW_MS) {
    for (const [key, bucket] of buckets) if (bucket.resetTime <= now) buckets.delete(key)
    lastCleanup = now
  }

  const bucket = buckets.get(ip)
  if (!bucket || bucket.resetTime <= now) {
    buckets.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return true
  }

  if (bucket.count >= LIMIT) return false
  bucket.count += 1
  return true
}

const needsAuth = (pathname: string) =>
  protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
  (pathname.startsWith("/api/") && !publicApi.some((path) => pathname === path || pathname.startsWith(`${path}/`)))

export default auth((request) => {
  const response = setSecurityHeaders(NextResponse.next())
  const pathname = request.nextUrl.pathname

  if (!rateLimit(clientIp(request))) {
    return setSecurityHeaders(NextResponse.json({ error: "rate_limited" }, { status: 429 }))
  }

  if (!needsAuth(pathname)) return response

  if (request.headers.get("authorization")?.trim() || request.auth) return response

  if (pathname.startsWith("/api/")) {
    return setSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
  }

  const url = new URL("/login", request.url)
  url.searchParams.set("callbackUrl", pathname)
  return setSecurityHeaders(NextResponse.redirect(url))
})

export const config = {
  matcher: [
    "/write/:path*",
    "/dashboard/:path*",
    "/library/:path*",
    "/voice/:path*",
    "/carousel/:path*",
    "/strategist/:path*",
    "/admin/:path*",
    "/agency-setup/:path*",
    "/api/:path*",
  ],
}
