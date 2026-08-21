"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { AuthPanelProvider } from "@/components/providers/AuthPanelContext"
import dynamic from "next/dynamic"

// The auth panel renders nothing until someone opens it, but importing it
// here put its framer-motion and next-auth signIn dependencies into the
// initial bundle for every route, since NavWrapper is in the root layout.
const AuthSlidePanel = dynamic(
  () => import("@/components/AuthSlidePanel").then((m) => m.AuthSlidePanel),
  { ssr: false },
)

const APP_ROUTES = [
  "/admin",
  "/agency",
  "/analytics",
  "/approvals",
  "/billing",
  "/calendar",
  "/career",
  "/carousels",
  "/chat",
  "/comment-generator",
  "/competitors",
  "/dashboard",
  "/forgot-password",
  "/library",
  "/login",
  "/reset-password",
  "/settings",
  "/silent-growth",
  "/signup",
  "/upgrade",
  "/verify-email",
  "/voice",
  "/write",
  "/writer",
]

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isApp = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))

  if (isApp) return <>{children}</>

  return (
    <AuthPanelProvider>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />
      <AuthSlidePanel />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </AuthPanelProvider>
  )
}
