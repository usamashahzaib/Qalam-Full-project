import type { NextFetchEvent, NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { hasValidClerkPublishableKey } from "@/lib/clerk-env"

const PROTECTED_PREFIXES = [
  "/dashboard(.*)",
  "/library(.*)",
  "/voice(.*)",
  "/write(.*)",
  "/strategist(.*)",
  "/writer(.*)",
  "/api/generate(.*)",
  "/api/hooks(.*)",
  "/api/strategist(.*)",
  "/api/voice(.*)",
  "/api/carousel(.*)",
  "/carousel(.*)",
  "/api/posts(.*)",
  "/api/analytics(.*)",
  "/api/schedule(.*)",
  "/api/approval(.*)",
]

const PUBLIC_PREFIXES = [
  "/api/linkedin/auth-url",
  "/api/linkedin/callback",
]

const isProtectedRoute = (req: NextRequest) => {
  const path = req.nextUrl.pathname
  if (PUBLIC_PREFIXES.some((route) => path.startsWith(route))) return false
  if (path.startsWith("/api/linkedin/")) return true
  return PROTECTED_PREFIXES.some((route) => path.startsWith(route.replace("(.*)", "")))
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!hasValidClerkPublishableKey()) return NextResponse.next()

  const { clerkMiddleware } = await import("@clerk/nextjs/server")
  const middleware = clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) await auth.protect()
  })

  return middleware(req, event)
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
