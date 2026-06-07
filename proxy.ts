import { auth } from "@/auth"

export default auth((req) => {
  const isPublic = /^\/(login|signup|pricing|about|contact|free-tools|api\/auth)/.test(req.nextUrl.pathname)
  if (!req.auth && !isPublic) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
