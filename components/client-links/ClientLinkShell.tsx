import { QalamLogo } from "@/components/QalamLogo"

export function ClientLinkShell({ children, width = "narrow" }: { children: React.ReactNode; width?: "narrow" | "wide" }) {
  return (
    <div className="min-h-screen bg-zinc-50 font-jakarta text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className={`mx-auto flex items-center justify-between ${width === "wide" ? "max-w-4xl" : "max-w-xl"}`}>
          <QalamLogo href="/" size={22} textClassName="text-sm font-extrabold text-zinc-900" containerClassName="flex min-h-11 items-center gap-2" />
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            Private link
          </span>
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 sm:py-12 ${width === "wide" ? "max-w-4xl" : "max-w-xl"}`}>{children}</main>
    </div>
  )
}

export function ClientLinkMessage({ tone, title, body, children }: { tone: "neutral" | "success" | "error"; title: string; body: string; children?: React.ReactNode }) {
  const styles = {
    neutral: "border-zinc-200 bg-white",
    success: "border-emerald-200 bg-emerald-50",
    error: "border-amber-200 bg-amber-50",
  }[tone]
  return (
    <div className={`rounded-2xl border px-6 py-8 text-center ${styles}`}>
      <p className="text-lg font-bold text-zinc-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">{body}</p>
      {children}
    </div>
  )
}

export function ClientLinkSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-zinc-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-200" />
      <div className="h-12 animate-pulse rounded-xl bg-zinc-200" />
    </div>
  )
}
