import type { NextAuthConfig } from "next-auth"

// Shared Auth.js settings. Route protection does not live here: NextAuth is
// not used as middleware, so an `authorized` callback would never run.
// proxy.ts gates pages and APIs (see lib/protected-routes.ts) and sends
// signed-in visitors away from auth screens via authenticatedAuthRedirect.
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login", error: "/login" },
  providers: [],
}
