import { NextRequest, NextResponse } from "next/server"

const BOT_PATTERN = /bot|crawler|spider|headless|python-requests|curl|wget|scrapy|postman|phantom|selenium|playwright|puppeteer/i

export function detectBot(request: NextRequest): { isBot: boolean; reason?: string } {
  const ua = request.headers.get("user-agent") || ""
  if (!ua.trim()) return { isBot: true, reason: "No user agent" }
  if (BOT_PATTERN.test(ua)) return { isBot: true, reason: "Known bot pattern" }
  if (request.headers.get("x-headless") || request.headers.get("x-automation") || request.headers.get("sec-ch-ua")?.includes("Headless")) {
    return { isBot: true, reason: "Automation headers detected" }
  }
  return { isBot: false }
}

export function validateApiKey(request: NextRequest): boolean {
  const path = request.nextUrl.pathname
  if (path.startsWith("/api/admin")) return request.headers.get("x-admin-key") === process.env.ADMIN_API_KEY
  if (path.startsWith("/api/webhooks")) return Boolean(request.headers.get("stripe-signature") || request.headers.get("x-webhook-signature"))
  return true
}

export function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 5000)
}

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
  return response
}

export function logApiRequest(request: NextRequest, requestId: string): void {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const ua = request.headers.get("user-agent")?.substring(0, 50)
  console.log(`[${requestId}] ${request.method} ${request.nextUrl.pathname} - IP: ${ip} - UA: ${ua}`)
}
