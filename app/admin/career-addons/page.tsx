import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { CareerAddonAdmin } from "./CareerAddonAdmin"

export const metadata: Metadata = { title: "Career Add-ons Admin", robots: { index: false, follow: false } }

export default async function CareerAddonAdminPage() {
  await requireAdminPage()
  return <CareerAddonAdmin />
}
