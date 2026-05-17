"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { AuthPanelProvider } from "@/components/providers/AuthPanelContext"
import { AuthSlidePanel } from "@/components/AuthSlidePanel"

const APP_ROUTES = [
  "/dashboard",
  "/write",
  "/writer",
  "/calendar",
  "/library",
  "/analytics",
  "/voice",
  "/agency",
  "/competitors",
  "/settings",
  "/auth",
  "/login",
  "/signup",
]

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isApp = APP_ROUTES.some((r) => pathname.startsWith(r))

  if (isApp) return <>{children}</>

  return (
    <AuthProvider>
      <AuthPanelProvider>
        <Navbar />
        <AuthSlidePanel />
        <main className="flex-1">{children}</main>
        <Footer />
      </AuthPanelProvider>
    </AuthProvider>
  )
}
