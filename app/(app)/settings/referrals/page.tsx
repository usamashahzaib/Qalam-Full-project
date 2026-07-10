import type { Metadata } from "next"
import Link from "next/link"
import { ReferralCard } from "@/components/ReferralCard"

export const metadata: Metadata = { title: "Referrals" }

export default function ReferralsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
      <div className="mb-6">
        <Link href="/settings" className="text-sm font-semibold text-teal hover:text-teal-700">
          &larr; Back to Settings
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">Referrals</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Share your code and track clicks, signups, and paid conversions.
        </p>
      </div>
      <ReferralCard />
    </div>
  )
}
