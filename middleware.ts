// Server-side route protection via NextAuth v5 middleware.
// The authorized() callback in auth.config.ts handles the per-route logic:
//   - PROTECTED routes   → redirect unauthenticated users to /login
//   - AUTH_ONLY routes   → redirect authenticated users to /dashboard
// Only page routes are listed here. API routes are protected individually
// via withAuth() in each handler (belt-and-suspenders is fine, but mixing
// middleware + withAuth for API routes creates response-format inconsistencies).
export { auth as default } from "@/auth"

export const config = {
  matcher: [
    // Protected app page routes
    "/dashboard/:path*",
    "/write/:path*",
    "/writer/:path*",
    "/settings/:path*",
    "/library/:path*",
    "/voice/:path*",
    "/analytics/:path*",
    "/calendar/:path*",
    "/carousels/:path*",
    "/competitors/:path*",
    "/agency/:path*",
    "/approvals/:path*",
    "/chat/:path*",
    // Auth-only routes — redirect logged-in users away from these
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
}
