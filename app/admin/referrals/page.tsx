import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireAdminPage } from "@/lib/server/workspace"
import { AdminReferralsClient } from "./AdminReferralsClient"

export const metadata: Metadata = {
  title: "Admin - Referrals",
  robots: { index: false, follow: false },
}

export default async function AdminReferralsPage() {
  const session = await requireAdminPage()

  if ((session as { adminEmailsNotConfigured?: boolean }).adminEmailsNotConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 font-jakarta">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-base font-bold text-amber-900">APP_ADMIN_EMAILS not configured</h1>
          <p className="mt-2 text-sm text-amber-800">
            Add <code className="rounded bg-amber-100 px-1">APP_ADMIN_EMAILS</code> to your environment variables.
          </p>
        </div>
      </main>
    )
  }

  if ((session as { notAdmin?: boolean }).notAdmin) {
    notFound()
  }

  return <AdminReferralsClient />
}
