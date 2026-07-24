import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { AdminReferralsClient } from "./AdminReferralsClient"

export const metadata: Metadata = {
  title: "Admin - Referrals",
  robots: { index: false, follow: false },
}

export default async function AdminReferralsPage() {
  await requireAdminPage()

  return <AdminReferralsClient />
}
