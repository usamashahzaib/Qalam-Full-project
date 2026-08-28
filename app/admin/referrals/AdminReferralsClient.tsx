"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type LeaderboardEntry = {
  referrerName: string
  referrerEmail: string
  codes: string[]
  totalClicks: number
  totalSignups: number
  totalPaidConversions: number
  totalRevenue: number
}

type ReferralUseDetail = {
  referredUserId: string
  referredUserEmail: string
  referredUserName: string
  referralCode: string
  referrerName: string
  referrerEmail: string
  discountApplied: number
  status: "pending" | "verified" | "paid" | "refunded"
  planName: string | null
  amountPaid: number
  paidAt: string | null
  createdAt: string
}

type AdminPayout = {
  id: string
  referrerUserId: string
  referrerName: string
  referrerEmail: string
  amount: number
  status: "pending" | "processing" | "paid" | "rejected"
  paymentMethod: string
  accountDetails: string
  paymentReference: string | null
  adminNote: string | null
  createdAt: string
  processedAt: string | null
}

const PLAN_OPTIONS = ["Solo", "Pro", "Agency"] as const

const statusClasses: Record<ReferralUseDetail["status"], string> = {
  pending: "bg-zinc-100 text-zinc-600",
  verified: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-red-100 text-red-700",
}

const payoutStatusClasses: Record<AdminPayout["status"], string> = {
  pending: "bg-zinc-100 text-zinc-600",
  processing: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
}

const CSV_COLUMNS = ["Name", "Email", "Codes", "Clicks", "Signups", "Paid conversions", "Revenue (PKR)"] as const

const toCsv = (rows: LeaderboardEntry[]): string => {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [CSV_COLUMNS.join(",")]
  for (const row of rows) {
    lines.push(
      [
        escape(row.referrerName),
        escape(row.referrerEmail),
        escape(row.codes.join(" | ")),
        row.totalClicks,
        row.totalSignups,
        row.totalPaidConversions,
        row.totalRevenue,
      ].join(",")
    )
  }
  return lines.join("\n")
}

const downloadCsv = (rows: LeaderboardEntry[]) => {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `qalam-referral-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function AdminReferralsClient() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [referredUsers, setReferredUsers] = useState<ReferralUseDetail[] | null>(null)
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ colleagueName: "", colleagueEmail: "", department: "", discountPercent: 20 })
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadLeaderboard = () => {
    fetch("/api/referrals/admin/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leaderboard.")
        return res.json()
      })
      .then((data) => {
        setLeaderboard(data.leaderboard || [])
        setReferredUsers(data.referredUsers || [])
      })
      .catch((e) => setError((e as Error).message))
  }

  const loadPayouts = () => {
    fetch("/api/referrals/admin/payouts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load payout queue.")
        return res.json()
      })
      .then((data) => setPayouts(data.payouts || []))
      .catch((e) => setError((e as Error).message))
  }

  useEffect(() => {
    loadLeaderboard()
    loadPayouts()
  }, [])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreateResult(null)
    try {
      const res = await fetch("/api/referrals/admin/create-for-colleague", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create referral code.")
      setCreateResult(data.code)
      setForm({ colleagueName: "", colleagueEmail: "", department: "", discountPercent: 20 })
      loadLeaderboard()
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const totals = leaderboard?.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.totalClicks,
      signups: acc.signups + row.totalSignups,
      paid: acc.paid + row.totalPaidConversions,
      revenue: acc.revenue + row.totalRevenue,
    }),
    { clicks: 0, signups: 0, paid: 0, revenue: 0 }
  )

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 font-jakarta text-zinc-900 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-xs font-semibold text-teal hover:text-teal-700">
              &larr; Back to Admin
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Referral Leaderboard</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Compare colleague referral performance.</p>
          </div>
          <button
            onClick={() => leaderboard && downloadCsv(leaderboard)}
            disabled={!leaderboard || leaderboard.length === 0}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Create a code for a colleague</h2>
          <form onSubmit={onCreate} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              required
              value={form.colleagueName}
              onChange={(e) => setForm((prev) => ({ ...prev, colleagueName: e.target.value }))}
              placeholder="Full name"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            />
            <input
              required
              type="email"
              value={form.colleagueEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, colleagueEmail: e.target.value }))}
              placeholder="colleague@company.com"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            />
            <input
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="Department (e.g. HR)"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: Number(e.target.value) }))}
              placeholder="Discount %"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-60 sm:col-span-2 lg:col-span-1"
            >
              {creating ? "Creating..." : "Create code"}
            </button>
          </form>
          {createResult && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Created: <span className="font-mono">{createResult}</span>
            </p>
          )}
          {createError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>
          )}
        </section>

        {totals && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total clicks" value={totals.clicks} />
            <Stat label="Total signups" value={totals.signups} />
            <Stat label="Paid conversions" value={totals.paid} />
            <Stat label="Total revenue" value={`PKR ${totals.revenue.toLocaleString("en-PK")}`} />
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-6 gap-2 bg-zinc-50 px-4 py-2.5 t-eyebrow font-semiboldr text-zinc-500">
            <span className="col-span-2">Colleague</span>
            <span>Clicks</span>
            <span>Signups</span>
            <span>Paid</span>
            <span>Revenue</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {leaderboard === null && !error && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">Loading leaderboard...</div>
            )}
            {leaderboard && leaderboard.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">No referral codes generated yet.</div>
            )}
            {leaderboard?.map((row) => (
              <div key={row.referrerEmail} className="grid grid-cols-6 items-center gap-2 px-4 py-3 text-sm">
                <div className="col-span-2">
                  <p className="font-semibold text-zinc-900">{row.referrerName}</p>
                  <p className="text-xs text-zinc-500">{row.referrerEmail}</p>
                  <p className="mt-0.5 font-mono t-eyebrow text-zinc-400">{row.codes.join(", ")}</p>
                </div>
                <span className="text-zinc-700">{row.totalClicks}</span>
                <span className="text-zinc-700">{row.totalSignups}</span>
                <span className="text-zinc-700">{row.totalPaidConversions}</span>
                <span className="font-semibold text-teal">PKR {row.totalRevenue.toLocaleString("en-PK")}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-base font-semibold text-zinc-900">Payout requests</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Approve to start processing, then mark paid with a transfer reference once sent.
            </p>
          </div>
          <div className="divide-y divide-zinc-100">
            {payouts === null && !error && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">Loading payout requests...</div>
            )}
            {payouts && payouts.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">No payout requests yet.</div>
            )}
            {payouts?.map((p) => (
              <PayoutQueueRow key={p.id} payout={p} onChanged={loadPayouts} />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-base font-semibold text-zinc-900">Referred users</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Verify the payment screenshot manually, then mark it paid once confirmed.
            </p>
          </div>
          <div className="divide-y divide-zinc-100">
            {referredUsers === null && !error && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">Loading referred users...</div>
            )}
            {referredUsers && referredUsers.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">No signups from referral codes yet.</div>
            )}
            {referredUsers?.map((use) => (
              <ReferredUserRow key={use.referredUserId} use={use} onPaid={loadLeaderboard} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function ReferredUserRow({ use, onPaid }: { use: ReferralUseDetail; onPaid: () => void }) {
  const [planName, setPlanName] = useState(use.planName || PLAN_OPTIONS[0])
  const [amountPaid, setAmountPaid] = useState(use.amountPaid || 0)
  const [submitting, setSubmitting] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const onMarkPaid = async () => {
    setSubmitting(true)
    setRowError(null)
    try {
      const res = await fetch("/api/referrals/admin/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referredUserId: use.referredUserId, planName, amountPaid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not mark this referral as paid.")
      onPaid()
    } catch (err) {
      setRowError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div>
        <p className="font-semibold text-zinc-900">{use.referredUserName}</p>
        <p className="text-xs text-zinc-500">{use.referredUserEmail}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          via <span className="font-mono">{use.referralCode}</span> ({use.referrerName}) - {use.discountApplied}% off
        </p>
        {rowError && <p className="mt-1 text-xs text-red-600">{rowError}</p>}
      </div>

      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClasses[use.status]}`}>
          {use.status}
        </span>

        {use.status === "paid" ? (
          <span className="text-xs text-zinc-500">
            {use.planName} - PKR {use.amountPaid.toLocaleString("en-PK")}
          </span>
        ) : (
          <>
            <select
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900 focus:border-teal focus:outline-none"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
              placeholder="Amount (PKR)"
              className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900 focus:border-teal focus:outline-none"
            />
            <button
              onClick={onMarkPaid}
              disabled={submitting || amountPaid <= 0}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Mark Paid"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PayoutQueueRow({ payout, onChanged }: { payout: AdminPayout; onChanged: () => void }) {
  const [reference, setReference] = useState("")
  const [note] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const runAction = async (path: string, body: Record<string, unknown>) => {
    setSubmitting(true)
    setRowError(null)
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: payout.id, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed.")
      onChanged()
    } catch (err) {
      setRowError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div>
        <p className="font-semibold text-zinc-900">{payout.referrerName}</p>
        <p className="text-xs text-zinc-500">{payout.referrerEmail}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          PKR {payout.amount.toLocaleString("en-PK")} - {payout.paymentMethod} - {payout.accountDetails}
        </p>
        {rowError && <p className="mt-1 text-xs text-red-600">{rowError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${payoutStatusClasses[payout.status]}`}>
          {payout.status}
        </span>

        {payout.status === "pending" && (
          <>
            <button
              onClick={() => runAction("/api/referrals/admin/payouts/approve", {})}
              disabled={submitting}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => runAction("/api/referrals/admin/payouts/reject", { adminNote: note })}
              disabled={submitting}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}

        {payout.status === "processing" && (
          <>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer reference"
              className="w-36 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900 focus:border-teal focus:outline-none"
            />
            <button
              onClick={() => runAction("/api/referrals/admin/payouts/mark-paid", { paymentReference: reference })}
              disabled={submitting || !reference.trim()}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark Paid
            </button>
            <button
              onClick={() => runAction("/api/referrals/admin/payouts/reject", { adminNote: note })}
              disabled={submitting}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}

        {payout.status === "paid" && (
          <span className="text-xs text-zinc-500">ref {payout.paymentReference}</span>
        )}
        {payout.status === "rejected" && payout.adminNote && (
          <span className="text-xs text-zinc-500">{payout.adminNote}</span>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  )
}
