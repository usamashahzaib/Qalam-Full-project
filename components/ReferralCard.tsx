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

type PayoutBalance = {
  totalCommission: number
  pendingPayout: number
  paidOut: number
  availableBalance: number
}

type PayoutRow = {
  id: string
  amount: number
  status: "pending" | "processing" | "paid" | "rejected"
  paymentMethod: string
  accountDetails: string
  paymentReference: string | null
  adminNote: string | null
  createdAt: string
  processedAt: string | null
}

const SITE_URL = "byqalam.com"
const MIN_PAYOUT_PKR = 1000
const PAYMENT_METHODS = [
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank", label: "Bank transfer" },
] as const

const payoutStatusClasses: Record<PayoutRow["status"], string> = {
  pending: "bg-zinc-100 text-zinc-600",
  processing: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
}

/**
 * Referral share copy.
 *
 * Every line states a specific, checkable mechanism rather than a superlative.
 * "The best LinkedIn writing tool" cannot be verified, is not a claim Qalam
 * makes anywhere else in the product, and does not survive being retold - the
 * listener has no fact to carry. A concrete capability does: the recipient can
 * repeat "it scores your resume the way an ATS does" to a third person and the
 * sentence still works without the sender present.
 */
function shareTemplates(code: string) {
  const link = `${SITE_URL}/?ref=${code}`
  return {
    linkedin: `Qalam writes from evidence you actually supply, so nothing on your profile is invented. It also scores a resume the way an ATS and a recruiter would, before you apply.\n\nMy code ${code} gets you 10% off.\n\n${link}`,
    whatsapp: `This checks your resume the way an ATS reads it, before you apply. Free to try. My code ${code} gets you 10% off if you upgrade. ${link}`,
    emailSubject: `The resume checker I mentioned, plus 10% off`,
    emailBody: `Hi,\n\nThis is the tool I mentioned. It reads a resume the way an ATS and a recruiter do and tells you what is costing you screenings. The check itself is free.\n\nIf you do upgrade, my code ${code} takes 10% off your first purchase.\n\n${link}\n\nThanks!`,
  }
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.94 8.5H3.56V20H6.94V8.5ZM5.25 3.5C4.1 3.5 3.25 4.36 3.25 5.44C3.25 6.5 4.08 7.38 5.22 7.38H5.25C6.42 7.38 7.25 6.5 7.25 5.44C7.23 4.36 6.42 3.5 5.25 3.5ZM20.75 20V13.44C20.75 9.94 18.88 8.31 16.39 8.31C14.39 8.31 13.49 9.41 12.99 10.19V8.5H9.6C9.65 9.53 9.6 20 9.6 20H12.99V13.63C12.99 13.29 13.01 12.95 13.11 12.71C13.38 12.04 14 11.34 15.03 11.34C16.39 11.34 17.37 12.24 17.37 13.6V20H20.75Z" />
    </svg>
  )
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.6L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.32 4.53 17.87 6.09C19.42 7.65 20.28 9.71 20.28 11.92C20.27 16.46 16.57 20.15 12.04 20.15ZM16.56 13.97C16.32 13.85 15.13 13.26 14.9 13.18C14.68 13.09 14.51 13.05 14.35 13.29C14.19 13.53 13.71 14.08 13.57 14.25C13.43 14.41 13.29 14.43 13.05 14.31C12.81 14.19 12.02 13.93 11.09 13.1C10.36 12.45 9.87 11.65 9.73 11.41C9.59 11.17 9.71 11.04 9.83 10.92C9.94 10.81 10.07 10.63 10.19 10.49C10.31 10.35 10.35 10.24 10.43 10.08C10.51 9.92 10.47 9.78 10.41 9.66C10.35 9.54 9.86 8.35 9.66 7.86C9.46 7.38 9.26 7.44 9.11 7.44C8.97 7.43 8.81 7.43 8.65 7.43C8.49 7.43 8.23 7.49 8.01 7.73C7.79 7.97 7.17 8.55 7.17 9.75C7.17 10.94 8.03 12.09 8.15 12.25C8.27 12.41 9.86 14.86 12.29 15.91C12.87 16.16 13.32 16.31 13.67 16.42C14.25 16.61 14.78 16.58 15.2 16.52C15.67 16.45 16.64 15.93 16.84 15.36C17.04 14.79 17.04 14.31 16.98 14.2C16.92 14.09 16.76 14.03 16.56 13.97Z" />
    </svg>
  )
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [balance, setBalance] = useState<PayoutBalance | null>(null)
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [payoutMethod, setPayoutMethod] = useState<string>(PAYMENT_METHODS[0].value)
  const [payoutAccount, setPayoutAccount] = useState("")
  const [payoutAmount, setPayoutAmount] = useState(0)
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null)

  const loadAll = () => {
    Promise.all([
      fetch("/api/referrals/stats").then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load referral stats.")))),
      fetch("/api/referrals/payouts").then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load payout info.")))),
    ])
      .then(([statsData, payoutData]) => {
        setStats(statsData)
        setBalance(payoutData.balance)
        setPayouts(payoutData.payouts || [])
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAll()
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
      loadAll()
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

  const onRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingPayout(true)
    setPayoutError(null)
    setPayoutSuccess(null)
    try {
      const res = await fetch("/api/referrals/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payoutAmount, paymentMethod: payoutMethod, accountDetails: payoutAccount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not submit payout request.")
      setPayoutSuccess("Payout request submitted. An admin will review it shortly.")
      setPayoutAccount("")
      setPayoutAmount(0)
      loadAll()
    } catch (e) {
      setPayoutError((e as Error).message)
    } finally {
      setSubmittingPayout(false)
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
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Refer &amp; earn</h2>
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

        {stats && stats.codes.length > 0 && balance && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total referrals" value={stats.totalReferred} />
              <Stat label="Available balance" value={`PKR ${balance.availableBalance.toLocaleString("en-PK")}`} />
              <Stat label="Pending payout" value={`PKR ${balance.pendingPayout.toLocaleString("en-PK")}`} />
              <Stat label="Paid out" value={`PKR ${balance.paidOut.toLocaleString("en-PK")}`} />
            </div>

            <div className="space-y-2">
              {stats.codes.map((c) => {
                const shareUrl = `${SITE_URL}/?ref=${c.code}`
                const templates = shareTemplates(c.code)
                return (
                  <div key={c.code} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-bold text-zinc-900">{c.code}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {c.usedCount} used{c.maxUses != null ? ` / ${c.maxUses}` : ""} - {c.discountPercent}% off for them, 10% commission for you - {c.clickCount} clicks
                        </p>
                      </div>
                      <button
                        onClick={() => onCopy(shareUrl, c.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                        {copiedCode === c.code ? "Copied!" : "Copy link"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onCopy(templates.linkedin, `${c.code}-linkedin`)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <LinkedInIcon className="h-3.5 w-3.5" />
                        {copiedCode === `${c.code}-linkedin` ? "Copied!" : "LinkedIn"}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(templates.whatsapp)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(templates.emailSubject)}&body=${encodeURIComponent(templates.emailBody)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <MailIcon className="h-3.5 w-3.5" />
                        Email
                      </a>
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
            Generate your referral code to start earning 10% commission on every friend who pays.
          </p>
        )}
      </section>

      {stats && stats.codes.length > 0 && balance && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Request payout</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Minimum payout is PKR {MIN_PAYOUT_PKR.toLocaleString("en-PK")}. Requests are reviewed by an admin before transfer.
          </p>

          <form onSubmit={onRequestPayout} className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              type="number"
              min={MIN_PAYOUT_PKR}
              max={balance.availableBalance}
              value={payoutAmount || ""}
              onChange={(e) => setPayoutAmount(Number(e.target.value))}
              placeholder={`Amount (max PKR ${balance.availableBalance.toLocaleString("en-PK")})`}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            />
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <input
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
              placeholder="Account number / IBAN"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingPayout || balance.availableBalance < MIN_PAYOUT_PKR}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
            >
              {submittingPayout ? "Submitting..." : "Request payout"}
            </button>
          </form>

          {payoutError && <p className="mt-3 text-xs text-red-600">{payoutError}</p>}
          {payoutSuccess && <p className="mt-3 text-xs text-emerald-600">{payoutSuccess}</p>}

          {payouts && payouts.length > 0 && (
            <div className="mt-5 divide-y divide-zinc-100 border-t border-zinc-100">
              {payouts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-zinc-900">PKR {p.amount.toLocaleString("en-PK")}</p>
                    <p className="text-xs text-zinc-500">
                      {p.paymentMethod} - {new Date(p.createdAt).toLocaleDateString("en-PK")}
                      {p.paymentReference ? ` - ref ${p.paymentReference}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${payoutStatusClasses[p.status]}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
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
