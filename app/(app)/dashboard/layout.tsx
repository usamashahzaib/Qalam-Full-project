import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

export default function DashboardLayout({
  children,
  stats,
  feed,
}: {
  children: React.ReactNode
  stats: React.ReactNode
  feed: React.ReactNode
}) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {children}
        {stats}
        {feed}
      </div>
    </main>
  )
}
