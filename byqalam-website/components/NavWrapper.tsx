"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"

const APP_ROUTES = ["/dashboard", "/write"]

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isApp = APP_ROUTES.some((r) => pathname.startsWith(r))

  if (isApp) return <>{children}</>

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
