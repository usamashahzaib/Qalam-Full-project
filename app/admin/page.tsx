import type { Metadata } from "next"
import { cookies } from "next/headers"
import { appSessionCookieName, requireAdminPageToken } from "@/lib/server/admin"
import { AdminDashboard } from "./AdminDashboard"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const session = requireAdminPageToken(cookieStore.get(appSessionCookieName)?.value)
  if (!session) return null
  return <AdminDashboard adminEmail={session.email} />
}
