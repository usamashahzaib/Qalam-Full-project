import type { NextAuthConfig } from "next-auth"

// App page routes that require authentication
const PROTECTED = [
  "/dashboard",
  "/write",
  "/writer",
  "/settings",
  "/library",
  "/voice",
  "/analytics",
  "/calendar",
  "/carousels",
  "/comment-generator",
  "/competitors",
  "/agency",
  "/approvals",
  "/chat",
]

// Auth-only routes - redirect logged-in users away from these
const AUTH_ONLY = ["/login", "/signup", "/forgot-password", "/reset-password"]

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isLoggedIn = !!auth?.user

      const isProtected = PROTECTED.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      )
      const isAuthOnly = AUTH_ONLY.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      )

      // Redirect authenticated users away from auth pages
      if (isAuthOnly && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl.origin))
      }

      // Require auth for app page routes
      if (isProtected) return isLoggedIn

      // For API routes matched by middleware: return 401 JSON instead of redirect
      if (pathname.startsWith("/api/") && !isLoggedIn) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      return true
    },
  },
  providers: [],
}
