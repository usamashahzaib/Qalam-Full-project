"use client"

export function ReferralBadge({ discountPercent }: { discountPercent: number }) {
  if (discountPercent <= 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5 11 15l4-5" />
      </svg>
      Pay manually to get {discountPercent}% off
    </span>
  )
}
