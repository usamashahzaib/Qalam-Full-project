import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = [
    "/",
    "/login",
    "/signup",
    "/pricing",
    "/about",
    "/contact",
    "/free-tools",
    "/demo",
    "/blog",
    "/docs",
    "/changelog",
    "/status",
    "/privacy",
    "/terms",
    "/careers",
    "/product",
    "/use-cases",
    "/agency-setup",
  ].some((route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"))

  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|.*\..*).*)"],
}
