import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { CareerOrganizationAdmin } from "./CareerOrganizationAdmin"

export const metadata: Metadata = { title: "Career Organizations", robots: { index: false, follow: false } }

export default async function CareerOrganizationsAdminPage() {
  await requireAdminPage()
  return <CareerOrganizationAdmin />
}
