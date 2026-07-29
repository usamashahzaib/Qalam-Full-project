"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { AuthPanelProvider } from "@/components/providers/AuthPanelContext"
import { AuthSlidePanel } from "@/components/AuthSlidePanel"

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
