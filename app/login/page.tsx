"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Server configuration error. Please try again shortly or contact support.",
  AccessDenied: "Access was denied. Please try again.",
  Verification: "Verification failed. Please try again.",
  Default: "Something went wrong. Please try again.",
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const errorParam = searchParams.get("error")
  const errorMessage = errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.Default) : null
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      await signIn("linkedin", { callbackUrl })
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <h2 className="text-3xl font-bold text-center">Welcome back</h2>
        <p className="text-center text-gray-600">New to Qalam? Create a free account</p>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 text-center">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#0077b5] text-white py-3 px-4 rounded-lg hover:bg-[#006396] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Redirecting…" : "Continue with LinkedIn"}
        </button>
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
