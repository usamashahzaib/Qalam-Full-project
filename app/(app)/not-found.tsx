import Link from "next/link"

// Lives inside the (app) route group so an unknown authenticated URL renders
// within the app shell (sidebar + nav) instead of falling through to the
// marketing global not-found, which sits outside the app chrome.
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
        <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-900">Page not found</h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        This page does not exist or may have moved. Head back to your dashboard to keep going.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
