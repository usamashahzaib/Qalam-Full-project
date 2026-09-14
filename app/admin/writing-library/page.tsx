import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/server/workspace"
import { WritingLibraryAdmin } from "./WritingLibraryAdmin"

export const metadata: Metadata = { title: "Writing library", robots: { index: false, follow: false } }

export default async function WritingLibraryPage() {
  await requireAdminPage()
  return <WritingLibraryAdmin />
}
