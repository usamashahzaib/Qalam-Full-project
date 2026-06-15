import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireAdminPage } from "@/lib/server/workspace"
import { AdminDashboard } from "./AdminDashboard"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const session = await requireAdminPage()

  if ((session as { adminEmailsNotConfigured?: boolean }).adminEmailsNotConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 font-jakarta">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-base font-bold text-amber-900">ADMIN_EMAILS not configured</h1>
          <p className="mt-2 text-sm text-amber-800">
            Add <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code> to your Vercel environment variables.
          </p>
          <p className="mt-3 text-sm text-amber-800">
            Your session email is: <strong>{session.email || "(not detected)"}</strong>
          </p>
          <p className="mt-2 text-xs text-amber-700">Set ADMIN_EMAILS to that exact email, then redeploy.</p>
        </div>
      </main>
    )
  }

  if ((session as { notAdmin?: boolean }).notAdmin) {
    notFound()
  }

  return <AdminDashboard adminEmail={session.email} />
}
