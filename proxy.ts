import { NextRequest, NextResponse } from "next/server"

// Routes that require an authenticated session.
// Extend this list as new app routes are built.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/write",
  "/writer",
  "/calendar",
  "/library",
  "/analytics",
  "/voice",
  "/agency",
  "/competitors",
  "/settings",
  "/approvals",
  "/carousels",
  "/chat",
]

const SESSION_COOKIE = "qalam_app_session"

// Edge-compatible HMAC-SHA256 verification.
// Mirrors lib/server/token.ts but uses Web Crypto (available in the Edge runtime).
async function isValidSessionToken(token: string): Promise<boolean> {
  const secret =
    process.env.APP_SESSION_SECRET ||
    (process.env.NODE_ENV !== "production" ? "qalam-dev-secret-local-only" : null)

  if (!secret) return false

  const dot = token.lastIndexOf(".")
  if (dot < 0) return false

  const encoded = token.slice(0, dot)
  const givenSig = token.slice(dot + 1)
  if (!encoded || !givenSig) return false

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const computed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded))
    const binary = Array.from(new Uint8Array(computed))
      .map((b) => String.fromCharCode(b))
      .join("")
    const computedSig = btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")

    // Constant-time string comparison to prevent timing attacks
    if (computedSig.length !== givenSig.length) return false
    let diff = 0
    for (let i = 0; i < computedSig.length; i++) {
      diff |= computedSig.charCodeAt(i) ^ givenSig.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  if (!needsAuth) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token && (await isValidSessionToken(token))) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/auth", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/write/:path*",
    "/writer/:path*",
    "/calendar/:path*",
    "/library/:path*",
    "/analytics/:path*",
    "/voice/:path*",
    "/agency/:path*",
    "/competitors/:path*",
    "/settings/:path*",
    "/approvals/:path*",
    "/carousels/:path*",
    "/chat/:path*",
  ],
}
