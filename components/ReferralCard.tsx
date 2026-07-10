"use client"

import { useEffect, useState } from "react"

type ReferralCode = {
  code: string
  usedCount: number
  maxUses: number | null
  discountPercent: number
  clickCount: number
  isActive: boolean
  createdAt: string
}

type ReferralStats = {
  codes: ReferralCode[]
  totalClicks: number
  totalReferred: number
  totalPaidConversions: number
  totalRevenue: number
}

const SITE_URL = "byqalam.com"

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/referrals/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load referral stats.")
        return res.json()
      })
      .then((data) => setStats(data))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const onGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/referrals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not generate a referral code.")
      const statsRes = await fetch("/api/referrals/stats")
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const onCopy = async (value: string, code: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // clipboard access denied - silently ignore, the value is still selectable
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-zinc-50" />
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Referrals</h2>
        {stats && stats.codes.length === 0 && (
          <button
            onClick={onGenerate}
            disabled={generating}
            className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
          >
            {generating ? "Generating..." : "Get my referral code"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {stats && stats.codes.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Clicks" value={stats.totalClicks} />
            <Stat label="Signups" value={stats.totalReferred} />
            <Stat label="Paid conversions" value={stats.totalPaidConversions} />
            <Stat label="Revenue" value={`PKR ${stats.totalRevenue.toLocaleString("en-PK")}`} />
          </div>

          <div className="space-y-2">
            {stats.codes.map((c) => {
              const shareUrl = `${SITE_URL}?ref=${c.code}`
              return (
                <div key={c.code} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-bold text-zinc-900">{c.code}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {c.usedCount} used{c.maxUses != null ? ` / ${c.maxUses}` : ""} - {c.discountPercent}% off - {c.clickCount} clicks
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onCopy(shareUrl, c.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                        {copiedCode === c.code ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs text-zinc-400">Share this link: {shareUrl}</p>
                </div>
              )
            })}
          </div>
        </>
      )}

      {stats && stats.codes.length === 0 && !error && (
        <p className="text-sm text-zinc-500">
          Generate your referral code to start tracking clicks, signups, and paid conversions.
        </p>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-zinc-900">{value}</p>
    </div>
  )
}
