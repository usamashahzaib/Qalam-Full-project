import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/writer(.*)",
  "/api/generate(.*)",
  "/api/hooks(.*)",
  "/api/strategist(.*)",
  "/api/voice(.*)",
  "/api/carousel(.*)",
  "/api/linkedin(.*)",
  "/api/posts(.*)",
  "/api/analytics(.*)",
  "/api/schedule(.*)",
  "/api/approval(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
