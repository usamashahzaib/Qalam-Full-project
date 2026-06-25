import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

// Use the edge-safe auth config (no Node.js-only imports) for middleware.
// The full auth.ts (with DB/Credentials) is used only in API routes.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: [
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
    // API routes that require auth — excludes public endpoints
    "/api/((?!auth/|webhooks/|free-tools/|tools/|geo/|health|contact|cron/).*)",
  ],
}
