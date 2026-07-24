import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { MigrationsClient } from "./MigrationsClient"

export const metadata: Metadata = {
  title: "DB Migrations - Admin",
  robots: { index: false, follow: false },
}

export default async function MigrationsPage() {
  const session = await requireAdminPage()
  return <MigrationsClient adminEmail={session.email} />
}
