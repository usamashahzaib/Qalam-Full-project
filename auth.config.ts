import type { NextAuthConfig } from "next-auth"

// App routes that require authentication (URL paths, not filesystem paths)
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
  "/competitors",
  "/agency",
  "/approvals",
  "/chat",
]

// Auth-only routes - redirect logged-in users away from these
const AUTH_ONLY = ["/login", "/signup", "/forgot-password", "/reset-password"]

export const authConfig: NextAuthConfig = {
  trustHost: true,
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

      // Require auth for app routes
      if (isProtected) return isLoggedIn

      return true
    },
  },
  providers: [],
}
