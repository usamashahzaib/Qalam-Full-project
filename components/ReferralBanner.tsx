"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

const REFERRAL_COOKIE = "qalam_referral_code"
const REFERRAL_STORAGE_KEY = "pending_referral_code"

function persistReferralCode(code: string) {
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, code)
  } catch {
    // localStorage unavailable (private mode) - cookie fallback below still works
  }
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; expires=${expires}; path=/; SameSite=Lax`
}

export function readPendingReferralCode(): string {
  try {
    return window.localStorage.getItem(REFERRAL_STORAGE_KEY) || ""
  } catch {
    return ""
  }
}

export function clearPendingReferralCode() {
  try {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch {
    // ignore
  }
  document.cookie = `${REFERRAL_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

export function ReferralBanner({ onCode }: { onCode?: (code: string) => void }) {
  const searchParams = useSearchParams()
  const [referrerName, setReferrerName] = useState<string | null>(null)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const ref = searchParams.get("ref")
    if (!ref) return
    const normalized = ref.trim().toUpperCase()

    fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: normalized, landingPath: window.location.pathname }),
    }).catch(() => undefined)

    fetch(`/api/referrals/validate?code=${encodeURIComponent(normalized)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setReferrerName(data.referrerName || null)
          setDiscountPercent(data.discountPercent || 0)
          setCode(normalized)
          persistReferralCode(normalized)
          onCode?.(normalized)
        }
      })
      .catch(() => undefined)
    // onCode intentionally omitted - stable callback expected from caller, avoid re-running on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  if (!code) return null

  return (
    <div className="mb-4 rounded-lg border border-teal/30 bg-teal/5 px-4 py-3 text-sm text-zinc-700">
      {referrerName ? (
        <>
          <span className="font-semibold text-teal">{referrerName}</span> referred you
          {discountPercent > 0 ? (
            <>
              {" "}- <span className="font-semibold text-teal">{discountPercent}% off</span> applied
            </>
          ) : null}
          .
        </>
      ) : (
        <>Referral code <span className="font-mono font-semibold">{code}</span> applied.</>
      )}
    </div>
  )
}
