import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { AdminDashboard } from "./AdminDashboard"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const session = await requireAdminPage()

  return <AdminDashboard adminEmail={session.email} />
}
