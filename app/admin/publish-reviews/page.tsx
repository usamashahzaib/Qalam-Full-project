import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { PublishReviewsClient } from "./PublishReviewsClient"

export const metadata: Metadata = { title: "Publish reviews - Admin", robots: { index: false, follow: false } }

export default async function PublishReviewsPage() {
  await requireAdminPage()
  return <PublishReviewsClient />
}
